class GeolocationService {
    constructor() {
        this.watchId = null;
        this.isTracking = false;
        this.lastPosition = null;
        this.options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000 // Allow cached position for up to 30 seconds
        };
        this.callbacks = {
            onLocationUpdate: null,
            onError: null,
            onStatusChange: null
        };
    }

    isSupported() {
        return 'geolocation' in navigator;
    }

    async requestPermission() {
        if (!this.isSupported()) {
            throw new Error('Geolocation is not supported by this browser');
        }

        try {
            // Test if we can get the current position
            const position = await this.getCurrentPosition();
            return true;
        } catch (error) {
            if (error.code === error.PERMISSION_DENIED) {
                throw new Error('位置情報へのアクセスが拒否されました。ブラウザの設定で位置情報を許可してください。');
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                throw new Error('位置情報が利用できません。');
            } else if (error.code === error.TIMEOUT) {
                throw new Error('位置情報の取得がタイムアウトしました。');
            } else {
                throw new Error('位置情報の取得に失敗しました: ' + error.message);
            }
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.lastPosition = position;
                    resolve(position);
                },
                (error) => reject(error),
                this.options
            );
        });
    }

    startTracking() {
        if (!this.isSupported()) {
            throw new Error('Geolocation is not supported');
        }

        if (this.isTracking) {
            return;
        }

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.lastPosition = position;
                if (this.callbacks.onLocationUpdate) {
                    this.callbacks.onLocationUpdate(position);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
            },
            this.options
        );

        this.isTracking = true;
        if (this.callbacks.onStatusChange) {
            this.callbacks.onStatusChange(true);
        }
    }

    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        this.isTracking = false;
        if (this.callbacks.onStatusChange) {
            this.callbacks.onStatusChange(false);
        }
    }

    getLastPosition() {
        return this.lastPosition;
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    // Utility methods
    static calculateDistance(pos1, pos2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = pos1.coords.latitude * Math.PI/180;
        const φ2 = pos2.coords.latitude * Math.PI/180;
        const Δφ = (pos2.coords.latitude - pos1.coords.latitude) * Math.PI/180;
        const Δλ = (pos2.coords.longitude - pos1.coords.longitude) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    }

    static formatCoordinate(coord) {
        return Number(coord).toFixed(6);
    }

    static formatAccuracy(accuracy) {
        if (accuracy === null || accuracy === undefined) {
            return '---';
        }
        return Math.round(accuracy) + 'm';
    }

    static formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

export default GeolocationService;