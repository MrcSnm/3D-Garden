import { Tween } from "three/examples/jsm/libs/tween.module.js";
import gsap from "gsap";
import { TextGeometry } from "three/examples/jsm/Addons.js";
import { BufferGeometry, Mesh, MeshBasicMaterial, PlaneGeometry } from "three";

/**
 * 
 * @template T
 * @param {T} data 
 * @param  {...T} values
 * @returns {boolean}
 */
export function isAnyOf(data, ...values)
{
    for(let i = 0; i < values.length; i++)
        if(data == values[i]) return true;
    return false;
}

/**
 * Enforces the type. Great for working with JavaScript.
 * @template T
 *
 * @param {any} data
 * @param {new() => T} Class
 *
 * @returns {T}
 */
export function enforceType(data, Class)
{
    if(!(data instanceof Class))
        throw new Error(`Data is not instance of type ${Class.name}`);
    return data;
}

/**
 *
 * See {@link import("gsap").EaseString} for easings.
 * @param {number} duration
 * @param {(progress: number) => void} onProgress onProgress executed each frame
 * @param {gsap.EaseString | string} easing
 * @param {() => void} onComplete Optional onComplete
 * @returns {gsap.core.Tween}
 */
export function tweenWithOnProgress(duration, onProgress, ease = "none", onComplete)
{
    const p = {progress: 0};
    return gsap.to(p, {progress: 1, duration, ease,
        onUpdate()
        {
            onProgress(p.progress);
        },
        onComplete()
        {
            if(onComplete) onComplete();
        }
    });
}

/**
 *
 * @param {BufferGeometry} geometry
 * @returns {{width: number, height: number}}
 */
export function getGeometrySize(geometry)
{
    enforceType(geometry, BufferGeometry);
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const width = bb.max.x - bb.min.x;
    const height = bb.max.y - bb.min.y;
    return {width, height};
}

/**
 * @param {TextGeometry} geometry
 */
export function textAlignToCenter(geometry, boundWidth, boundHeight)
{
    geometry = enforceType(geometry, TextGeometry);
    let {width, height} = getGeometrySize(geometry);

    if(boundWidth)
        width = boundWidth - width;
    if(boundHeight)
        height = boundHeight - height;

    geometry.translate(width/2, -height/2, 0);
    return geometry;
}



/**
 * @param {THREE.Texture} texture
 * @param {number} width
 * @param {number} height
 * @returns {Mesh}
 */
export function meshFromSprite(texture, width = -1, height = -1)
{
    if(!texture)
        throw new Error("Null Texture?");
    return new Mesh(new PlaneGeometry(width == -1 ? texture.width : width, height == -1 ? texture.height : height), new MeshBasicMaterial({map: texture, transparent: true, depthTest: true}));
}
