// TimerController.js - Centralized timer lifecycle for MainGameplay
// Owns: seconds state, Phaser time event, tick predicate, add/sub operations, expiry callback.

export default class TimerController {
    /**
     * @param {Phaser.Scene} scene - The owning Phaser scene
     * @param {Object} opts
     * @param {number} [opts.initial=60] - Initial seconds remaining
     * @param {number} [opts.cap=60] - Max cap for time increases
     * @param {() => boolean} [opts.shouldTick] - Predicate; when false, ticking is skipped
     * @param {(seconds: number) => void} [opts.onTick] - Called after each effective tick or time change
     * @param {() => void} [opts.onExpired] - Called once when time reaches 0
     */
    constructor(scene, opts = {}) {
        this.scene = scene;
        this.seconds = typeof opts.initial === 'number' ? opts.initial : 60;
        this.cap = typeof opts.cap === 'number' ? opts.cap : 60;
        this.shouldTick = typeof opts.shouldTick === 'function' ? opts.shouldTick : () => true;
        this.onTick = typeof opts.onTick === 'function' ? opts.onTick : () => {};
        this.onExpired = typeof opts.onExpired === 'function' ? opts.onExpired : () => {};
        this._event = null;
        this._expired = false;
    }

    getSeconds() { return this.seconds; }
    setSeconds(value) {
        const v = Math.max(0, Math.min(this.cap, Math.floor(value)));
        this.seconds = v;
        this._maybeExpire();
        this._emitTick();
    }

    add(seconds) {
        const before = this.seconds;
        this.seconds = Math.min(this.cap, before + Math.floor(seconds));
        const gained = this.seconds - before;
        this._maybeExpire();
        this._emitTick();
        return gained;
    }

    sub(seconds) {
        const before = this.seconds;
        this.seconds = Math.max(0, before - Math.floor(seconds));
        const lost = before - this.seconds;
        this._maybeExpire();
        this._emitTick();
        return lost;
    }

    start() {
        // Ensure single event
        this.stop();
        this._expired = false;
        this._event = this.scene.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => this._tick(),
        });
    }

    stop() {
        if (this._event) {
            try { this._event.remove(); } catch (_) {}
            this._event = null;
        }
    }

    destroy() { this.stop(); }

    _tick() {
        if (this._expired) return;
        try {
            if (!this.shouldTick()) return; // Pause conditions
            if (this.seconds > 0) {
                this.seconds = Math.max(0, this.seconds - 1);
                this._emitTick();
                if (this.seconds === 0) {
                    this._maybeExpire();
                }
            }
        } catch (_) {
            // be resilient at runtime
        }
    }

    _emitTick() {
        try { this.onTick(this.seconds); } catch (_) {}
    }

    _maybeExpire() {
        if (this._expired) return;
        if (this.seconds <= 0) {
            this._expired = true;
            // Stop future ticks before invoking callback to avoid reentrancy/duplicates
            this.stop();
            try { this.onExpired(); } catch (_) {}
        }
    }
}
