
export const GameEvents = Object.freeze({
    spawnUnit: 0,
    click: 1,
    toggleSound: 2,
    changeTime: 3,
    advanceDay: 4
});

/**
 * @typedef {(...args: any) => boolean} EventCallback
 */

/**
 * This class is responsible for registering events for the entire game.
 * This instance is usually passed by value for every class.
 *
 * After that, any of those classes can enlist to one of those events.
 * Or even emit those events (good for decoupling the UI from other classes)
 */
export class GameEventEmitter
{
    constructor()
    {
        /** @type {Map<number, Array<EventCallback>} */
        this.events = new Map();
        for(const v of Object.values(GameEvents))
            this.events.set(v, []);
    }

    /**
     * 
     * @param {GameEvents[keyof GameEvents]} event Event type to listen
     * @param {EventCallback} listener Returns either true or false of disabling other handlers
     * @returns {EventCallback} The listener itself, for becoming removable from the emitter
     */
    addListener(event, listener)
    {
        this.events.get(event).push(listener);
        return listener;
    }
    /**
     *
     * @param {GameEvents[keyof GameEVents]} event The event
     * @param {EventCallback} listener An already added listener.
     */
    removeListener(event, listener)
    {
        const list = this.events.get(event);
        list.splice(list.indexOf(listener), 1);
    }
    /**
     *
     * @param {GameEvents[keyof GameEvents]} event The event to emit, see {@link GameEvents}
     * @param  {...any} args Emit with arguments
     * @returns Nothing
     */
    emitEvent(event, ...args)
    {
        const list = this.events.get(event);
        for(const callback of list)
        {
            if(callback(...args))
                return;
        }
    }
}