import Database from './database.js';
import GeolocationService from './geolocation.js';

class LocationTracker {
    constructor() {
        this.database = new Database();
        this.geolocation = new GeolocationService();
        this.intervalId = null;
        this.currentPage = 1;
        this.recordsPerPage = 10;
        
        this.elements = {
            trackingStatus: document.getElementById('tracking-status'),
            lastUpdate: document.getElementById('last-update'),
            currentLat: document.getElementById('current-lat'),
            currentLng: document.getElementById('current-lng'),
            currentAccuracy: document.getElementById('current-accuracy'),
            currentTimestamp: document.getElementById('current-timestamp'),
            startBtn: document.getElementById('start-btn'),
            stopBtn: document.getElementById('stop-btn'),
            clearBtn: document.getElementById('clear-btn'),
            exportBtn: document.getElementById('export-btn'),
            totalRecords: document.getElementById('total-records'),
            firstRecord: document.getElementById('first-record'),
            lastRecord: document.getElementById('last-record'),
            locationHistory: document.getElementById('location-history'),
            prevPage: document.getElementById('prev-page'),
            nextPage: document.getElementById('next-page'),
            pageInfo: document.getElementById('page-info')
        };

        this.init();
    }

    async init() {
        try {
            // Check geolocation support
            if (!this.geolocation.isSupported()) {
                throw new Error('このブラウザは位置情報をサポートしていません。');
            }

            // Setup event listeners
            this.setupEventListeners();
            
            // Setup geolocation callbacks
            this.geolocation.setCallbacks({
                onLocationUpdate: this.onLocationUpdate.bind(this),
                onError: this.onGeolocationError.bind(this),
                onStatusChange: this.onTrackingStatusChange.bind(this)
            });

            // Wait for database to initialize
            await this.database.initPromise;
            
            // Load initial data
            await this.updateStatistics();
            await this.loadLocationHistory();

            console.log('Location Tracker initialized successfully');
        } catch (error) {
            console.error('Initialization failed:', error);
            alert('アプリケーションの初期化に失敗しました: ' + error.message);
        }
    }

    setupEventListeners() {
        this.elements.startBtn.addEventListener('click', () => this.startTracking());
        this.elements.stopBtn.addEventListener('click', () => this.stopTracking());
        this.elements.clearBtn.addEventListener('click', () => this.clearData());
        this.elements.exportBtn.addEventListener('click', () => this.exportData());
        this.elements.prevPage.addEventListener('click', () => this.previousPage());
        this.elements.nextPage.addEventListener('click', () => this.nextPage());
    }

    async startTracking() {
        try {
            // Request permission first
            await this.geolocation.requestPermission();
            
            // Start geolocation tracking
            this.geolocation.startTracking();
            
            // Start automatic saving every 30 seconds
            this.intervalId = setInterval(() => {
                this.saveCurrentLocation();
            }, 30000); // 30 seconds

            this.elements.startBtn.disabled = true;
            this.elements.stopBtn.disabled = false;
            
        } catch (error) {
            console.error('Failed to start tracking:', error);
            alert('位置情報追跡の開始に失敗しました: ' + error.message);
        }
    }

    stopTracking() {
        // Stop geolocation tracking
        this.geolocation.stopTracking();
        
        // Clear interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
    }

    async saveCurrentLocation() {
        const position = this.geolocation.getLastPosition();
        if (position) {
            try {
                await this.database.saveLocation(
                    position.coords.latitude,
                    position.coords.longitude,
                    position.coords.accuracy
                );
                
                await this.updateStatistics();
                await this.loadLocationHistory();
                
                this.elements.lastUpdate.textContent = GeolocationService.formatTimestamp(Date.now());
            } catch (error) {
                console.error('Failed to save location:', error);
            }
        }
    }

    onLocationUpdate(position) {
        this.updateCurrentLocationDisplay(position);
    }

    onGeolocationError(error) {
        console.error('Geolocation error:', error);
        
        let message = '位置情報の取得エラー: ';
        if (error.code === error.PERMISSION_DENIED) {
            message += '位置情報へのアクセスが拒否されました。';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
            message += '位置情報が利用できません。';
        } else if (error.code === error.TIMEOUT) {
            message += '位置情報の取得がタイムアウトしました。';
        } else {
            message += error.message;
        }
        
        // Show error in UI
        this.elements.trackingStatus.textContent = 'エラー';
        this.elements.trackingStatus.className = 'text-red-500';
        
        // Stop tracking on error
        this.stopTracking();
    }

    onTrackingStatusChange(isTracking) {
        if (isTracking) {
            this.elements.trackingStatus.textContent = '追跡中';
            this.elements.trackingStatus.className = 'text-green-500';
        } else {
            this.elements.trackingStatus.textContent = '停止中';
            this.elements.trackingStatus.className = 'text-red-500';
        }
    }

    updateCurrentLocationDisplay(position) {
        this.elements.currentLat.textContent = GeolocationService.formatCoordinate(position.coords.latitude);
        this.elements.currentLng.textContent = GeolocationService.formatCoordinate(position.coords.longitude);
        this.elements.currentAccuracy.textContent = Math.round(position.coords.accuracy || 0);
        this.elements.currentTimestamp.textContent = GeolocationService.formatTimestamp(position.timestamp);
    }

    async updateStatistics() {
        try {
            const totalCount = await this.database.getTotalCount();
            const firstRecord = await this.database.getFirstRecord();
            const lastRecord = await this.database.getLastRecord();

            this.elements.totalRecords.textContent = totalCount;
            
            this.elements.firstRecord.textContent = firstRecord
                ? GeolocationService.formatTimestamp(firstRecord.timestamp)
                : '---';
                
            this.elements.lastRecord.textContent = lastRecord
                ? GeolocationService.formatTimestamp(lastRecord.timestamp)
                : '---';
        } catch (error) {
            console.error('Failed to update statistics:', error);
        }
    }

    async loadLocationHistory() {
        try {
            const offset = (this.currentPage - 1) * this.recordsPerPage;
            const locations = await this.database.getLocations(this.recordsPerPage, offset);
            
            this.elements.locationHistory.innerHTML = '';
            
            locations.forEach(location => {
                const row = document.createElement('tr');
                row.className = 'border-b border-gray-200';
                
                row.innerHTML = `
                    <td class="px-4 py-2">${GeolocationService.formatTimestamp(location.timestamp)}</td>
                    <td class="px-4 py-2">${GeolocationService.formatCoordinate(location.latitude)}</td>
                    <td class="px-4 py-2">${GeolocationService.formatCoordinate(location.longitude)}</td>
                    <td class="px-4 py-2">${GeolocationService.formatAccuracy(location.accuracy)}</td>
                `;
                
                this.elements.locationHistory.appendChild(row);
            });
            
            this.updatePagination();
        } catch (error) {
            console.error('Failed to load location history:', error);
        }
    }

    async updatePagination() {
        const totalCount = await this.database.getTotalCount();
        const totalPages = Math.ceil(totalCount / this.recordsPerPage);
        
        this.elements.pageInfo.textContent = `ページ ${this.currentPage} / ${totalPages}`;
        this.elements.prevPage.disabled = this.currentPage <= 1;
        this.elements.nextPage.disabled = this.currentPage >= totalPages;
    }

    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.loadLocationHistory();
        }
    }

    async nextPage() {
        const totalCount = await this.database.getTotalCount();
        const totalPages = Math.ceil(totalCount / this.recordsPerPage);
        
        if (this.currentPage < totalPages) {
            this.currentPage++;
            await this.loadLocationHistory();
        }
    }

    async clearData() {
        if (confirm('すべての位置情報データを削除しますか？この操作は元に戻せません。')) {
            try {
                await this.database.clearAllData();
                await this.updateStatistics();
                await this.loadLocationHistory();
                this.currentPage = 1;
                
                alert('データを削除しました。');
            } catch (error) {
                console.error('Failed to clear data:', error);
                alert('データの削除に失敗しました: ' + error.message);
            }
        }
    }

    async exportData() {
        try {
            const exportData = await this.database.exportData();
            
            // Create download
            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `location-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            alert('データをエクスポートしました。');
        } catch (error) {
            console.error('Failed to export data:', error);
            alert('データのエクスポートに失敗しました: ' + error.message);
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LocationTracker();
});