export class VolumeEnvelope {
    private _currentVolume = 0;
    get currentVolume(): number {
        return this._currentVolume;
    }

    private _startingVolume = 0;
    get startingVolume(): number {
        return this._startingVolume;
    }
    set startingVolume(value: number) {
        this._startingVolume = value;
        this._currentVolume = value;
    }

    enabled = false;
    period = 0;
    increase = false;
    private counter = 0;

    clock() {
        if (!this.enabled || this.period === 0) {
            return;
        }

        if (--this.counter === 0) {
            this.counter = this.period === 0 ? 8 : this.period;

            if (this.increase && this._currentVolume < 15) {
                this._currentVolume++;
            } else if (!this.increase && this._currentVolume > 0) {
                this._currentVolume--;
            } else {
                this.enabled = false;
            }
        }
    }

    trigger() {
        this._currentVolume = this._startingVolume;
        this.counter = this.period;
        this.enabled = true;
    }

    reset() {
        this._currentVolume = 0;
        this._startingVolume = 0;
        this.enabled = false;
        this.period = 0;
        this.increase = false;
        this.counter = 0;
    }
}