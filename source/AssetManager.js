import { Howl } from "howler";
import { Loader, Texture, TextureLoader } from "three";
import { FontLoader, GLTFLoader } from "three/examples/jsm/Addons.js";
import * as Helvetiker from "three/examples/fonts/helvetiker_regular.typeface.json";
import * as HelvetikerBold from "three/examples/fonts/helvetiker_bold.typeface.json";

/** @type {TextureLoader} */
let textureLoader = null;
/** @type {GLTFLoader} */
let modelLoader = null;


/** @type { Font } */
let defaultFont = null;


const loadedAssets = new Map();

/**
 * Loads the assets and save them internally in a map for cached reuse.
 */
export const AssetManager =
{
    /**
     *
     * @param {string} path The path to load
     * @param {Loader} loader Any kind of loader
     * @returns The result of the loader
     */
    async loadAsync(path, loader)
    {
        if(loadedAssets.has(path))
            return loadedAssets.get(path);
        const ret = await loader.loadAsync(path);
        loadedAssets.set(path, ret);
        return ret;
    },

    async loadAudio(path)
    {
        if(loadedAssets.has(path))
            return loadedAssets.get(path);
        return new Promise((res, rej) =>
        {
            const sound = new Howl({
                src: path,
                onload(id){
                    loadedAssets.set(path, sound);
                    res(sound);
                }
            })
        });
    },
    /**
     * @param {string} path The path in which the asset exists
     * @returns The asset if it was already loaded.
     */
    get(path)
    {
        return loadedAssets.get(path);
    },
    /**
     * Helper function for getting type completion
     * @param {string} path etc
     * @returns {Texture}
     */
    getTexture(path)
    {
        return this.get(path);
    },
    /**
     * Helper function for getting type completion
     * @param {string} path
     * @returns {import("three/examples/jsm/Addons.js").GLTF}
     */
    getModel(path)
    {
        return this.get(path);
    },
    /**
     * Helper function for getting type completion
     * @param {string} path
     * @returns {Howl}
     */
    getAudio(path)
    {
        return this.get(path);
    },

    getDefaultFont()
    {
        if(!defaultFont) defaultFont = new FontLoader().parse(Helvetiker);
        return defaultFont;
    },

    /**
     *
     * @param {string} texturePath Path of the texture to load
     * @returns {Texture}
     */
    async loadTexture(texturePath)
    {
        if(!textureLoader) textureLoader = new TextureLoader();
        return this.loadAsync(texturePath, textureLoader);
    },

    /**
     *
     * @param {string} modelPath
     * @returns {import("three/examples/jsm/Addons.js").GLTF}
     */
    async loadModel(modelPath)
    {
        if(!modelLoader) modelLoader = new GLTFLoader();
        return this.loadAsync(modelPath, modelLoader);
    }
}