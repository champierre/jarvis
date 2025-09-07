class Database {
    constructor() {
        this.db = null;
        this.SQL = null;
        this.initPromise = this.initialize();
    }

    async initialize() {
        try {
            // Initialize SQL.js
            this.SQL = await window.initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });

            // Try to load existing database from IndexedDB
            const existingData = await this.loadFromIndexedDB();
            
            if (existingData) {
                this.db = new this.SQL.Database(new Uint8Array(existingData));
            } else {
                // Create new database
                this.db = new this.SQL.Database();
                this.createTables();
            }
            
            console.log('Database initialized successfully');
            return true;
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    createTables() {
        const sql = `
            CREATE TABLE IF NOT EXISTS locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                accuracy REAL,
                timestamp INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_timestamp ON locations(timestamp);
            CREATE INDEX IF NOT EXISTS idx_created_at ON locations(created_at);
        `;
        
        this.db.exec(sql);
    }

    async saveLocation(latitude, longitude, accuracy) {
        await this.initPromise;
        
        console.log('Database saveLocation called with:', { latitude, longitude, accuracy });
        
        try {
            const stmt = this.db.prepare(`
                INSERT INTO locations (latitude, longitude, accuracy, timestamp)
                VALUES (?, ?, ?, ?)
            `);
            
            const timestamp = Date.now();
            stmt.run([latitude, longitude, accuracy, timestamp]);
            stmt.free();
            
            console.log('Location inserted into SQLite');
            
            // Save to IndexedDB
            await this.saveToIndexedDB();
            console.log('Database saved to IndexedDB');
            
            return {
                latitude,
                longitude,
                accuracy,
                timestamp
            };
        } catch (error) {
            console.error('Error in saveLocation:', error);
            throw error;
        }
    }

    async getLocations(limit = 50, offset = 0) {
        await this.initPromise;
        
        const stmt = this.db.prepare(`
            SELECT * FROM locations 
            ORDER BY timestamp DESC 
            LIMIT ? OFFSET ?
        `);
        
        const results = [];
        stmt.bind([limit, offset]);
        
        while (stmt.step()) {
            const row = stmt.getAsObject();
            results.push(row);
        }
        
        stmt.free();
        return results;
    }

    async getTotalCount() {
        await this.initPromise;
        
        console.log('getTotalCount called');
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM locations');
        stmt.step();
        const result = stmt.getAsObject();
        stmt.free();
        
        console.log('Total count result:', result.count);
        return result.count;
    }

    async getFirstRecord() {
        await this.initPromise;
        
        const stmt = this.db.prepare(`
            SELECT * FROM locations 
            ORDER BY timestamp ASC 
            LIMIT 1
        `);
        
        let result = null;
        if (stmt.step()) {
            result = stmt.getAsObject();
        }
        
        stmt.free();
        return result;
    }

    async getLastRecord() {
        await this.initPromise;
        
        const stmt = this.db.prepare(`
            SELECT * FROM locations 
            ORDER BY timestamp DESC 
            LIMIT 1
        `);
        
        let result = null;
        if (stmt.step()) {
            result = stmt.getAsObject();
        }
        
        stmt.free();
        return result;
    }

    async clearAllData() {
        await this.initPromise;
        
        this.db.exec('DELETE FROM locations');
        await this.saveToIndexedDB();
    }

    async exportData() {
        await this.initPromise;
        
        const locations = await this.getLocations(10000); // Export up to 10k records
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            totalRecords: locations.length,
            locations: locations
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    // IndexedDB operations
    async saveToIndexedDB() {
        const data = this.db.export();
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('LocationTrackerDB', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['database'], 'readwrite');
                const store = transaction.objectStore('database');
                
                store.put({ id: 'main', data: data });
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            };
            
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('database')) {
                    db.createObjectStore('database', { keyPath: 'id' });
                }
            };
        });
    }

    async loadFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('LocationTrackerDB', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                
                if (!db.objectStoreNames.contains('database')) {
                    resolve(null);
                    return;
                }
                
                const transaction = db.transaction(['database'], 'readonly');
                const store = transaction.objectStore('database');
                const getRequest = store.get('main');
                
                getRequest.onsuccess = () => {
                    if (getRequest.result) {
                        resolve(getRequest.result.data);
                    } else {
                        resolve(null);
                    }
                };
                
                getRequest.onerror = () => reject(getRequest.error);
            };
            
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('database')) {
                    db.createObjectStore('database', { keyPath: 'id' });
                }
            };
        });
    }
}

export default Database;