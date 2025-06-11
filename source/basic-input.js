import * as THREE from 'three';
import { GameSize } from './globals';
export const Mouse = new THREE.Vector2(0,0);


/**
 * If it returns true, it means to stop propagation.
 * @typedef {(mouse: Readonly<THREE.Vector2>) => boolean} MouseCallback
 */

/**
 * @typedef IMouseCallback
 * @prop {MouseCallback | undefined} onMouseMove
 * @prop {MouseCallback | undefined} onMouseDown
 * @prop {MouseCallback | undefined} onMouseUp
 */



window.addEventListener('mousemove', (event) =>
{
    Mouse.x = (event.clientX / GameSize.width) * 2 - 1;
    Mouse.y = -((event.clientY / GameSize.height) * 2 - 1);
});

window.addEventListener('contextmenu', (ev) =>
{
    ev.preventDefault();
});


let mouseEvents = null;

/**
 * Simple MouseEvents handler. Holds a global instance that can add to itself callbacks at each kind of input from the player
 * Also autoremoves any kind of Object3D from the list when they're removed.
 */
export class MouseEvents
{
    /**
     * @type {IMouseCallback[]}
     */
    mouseHandlers = [];

    /**
     * @returns {MouseEvents}
     */
    static get()
    {
        if(mouseEvents == null) mouseEvents = new MouseEvents();
        return mouseEvents;
    }
    constructor()
    {
        window.addEventListener('mousedown', (ev) =>
        {
            if(ev.button == 2)
                ev.preventDefault();
            for(const v of this.mouseHandlers)
            {
                if(v.onMouseDown && v.onMouseDown(Mouse))
                    return;
            }
        });
        window.addEventListener('mousemove', (ev) =>
        {
            for(const v of this.mouseHandlers)
            {
                if(v.onMouseMove && v.onMouseMove(Mouse))
                    return;
            }
        });
        window.addEventListener('mouseup', (ev) =>
        {
            for(const v of this.mouseHandlers)
            {
                if(v.onMouseUp && v.onMouseUp(Mouse))
                    return;
            }
        });
    }
    /**
     *
     * @param {IMouseCallback & THREE.Object3D} handler Check {@link IMouseCallback} for possible handlers
     */
    addHandler(handler)
    {
        handler.addEventListener("removed", () =>
        {
            this.removeHandler(handler);
        });
        this.mouseHandlers.push(handler);
    }

    /**
     * @param {IMouseCallback & THREE.Object3D} handler
     */
    removeHandler(handler)
    {
        const index = this.mouseHandlers.indexOf(handler);
        if(index == -1)
            throw new Error(`Could not find handler`);
        this.mouseHandlers.splice(index, 1);
    }
}