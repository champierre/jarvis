class GeolocationService {
    constructor() {
        this.watchId = null;
        this.isTracking = false;
        this.lastPosition = null;
        this.options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
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

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    async requestPermission() {
        if (!this.isSupported()) {
            throw new Error('Geolocation is not supported');
        }

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

        this.isTracking = true;
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.lastPosition = position;
                if (this.callbacks.onLocationUpdate) {
                    this.callbacks.onLocationUpdate(position);
                }
            },
            (error) => {
                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
            },
            this.options
        );

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

    async getCurrentPosition() {
        if (!this.isSupported()) {
            throw new Error('Geolocation is not supported');
        }

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

    static formatCoordinate(coord) {
        return coord ? coord.toFixed(6) : '---';
    }

    static formatAccuracy(accuracy) {
        return accuracy ? Math.round(accuracy) + 'm' : '---';
    }

    static formatTimestamp(timestamp) {
        if (!timestamp) return '---';
        return new Date(timestamp).toLocaleString('ja-JP', {
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