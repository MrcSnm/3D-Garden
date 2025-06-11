import * as THREE from "three";
import { Mesh, MeshBasicMaterial, PlaneGeometry, TextureLoader } from "three";
import { AssetManager } from "./AssetManager";
import { GameSize, gIntersects, gRaycaster, ItemType } from "./globals";
import { Mouse, MouseEvents } from "./basic-input";
import { DayTime, PlayerData } from "./PlayerData";
import { FontLoader, TextGeometry } from "three/examples/jsm/Addons.js";
import { getGeometrySize, meshFromSprite, textAlignToCenter, tweenWithOnProgress } from "./utils";
import { TimeManager } from "./TimeManager";
import { GameEventEmitter, GameEvents } from "./GameEventEmitter";

const uiAssets = {
    pathPrefix: "assets/images/",
    pathExt: ".png",
    animals: [
        "cow",
        "sheep",
    ],
    crops: [
        "corn",
        "grape",
        "strawberry",
        "tomato"
    ],

    functional: [
        "sun",
        "moon",
        "skip_day",
        "smoke"
    ],
    misc: [
        "ui/sound_on",
        "ui/sound_off",
        "ui/default",
        "ui/hover",
        "ui/Headless",
        "ui/finger_down",
        "ui/finger_up"
    ]
}

function getAssetPath(basePath)
{
    return `${uiAssets.pathPrefix}${basePath}${uiAssets.pathExt}`;
}


export class UI
{
    mousePos = new THREE.Vector2();

    /**
     *
     * @param {THREE.Camera} camera
     * @param {TimeManager} timeManager
     * @param {GameEventEmitter} event For emitting events some times when clicking on UI
     * @param {*} slotSize
     * @param {*} itemSize
     * @param {*} itemOffset
     */
    constructor(camera, timeManager, event, slotSize = 130, itemSize = 100, itemOffset = 10)
    {
        this.hoveredItem = null;
        this.timeManager = timeManager;
        this.event = event;
        this.slotSize = slotSize;
        this.itemSize = itemSize;
        this.itemOffset = itemOffset;
        this.group = new THREE.Group();
        this.items = new THREE.Group();
        this.camera = camera
        this.selectedType = ItemType.cow;


        camera.add(this.group);
        this.group.add(this.items);
    }

    showTextBox()
    {
        tweenWithOnProgress(0.5, (progress) =>
        {
            this.msgBox.scale.set(progress,progress,progress);
        }, "elastic.out");
    }

    static async loadAssets()
    {
        const assetsToLoad = [];
        for(const key of Object.keys(uiAssets))
        {
            if(Array.isArray(uiAssets[key]))
            {
                for(const v of uiAssets[key])
                    assetsToLoad.push(AssetManager.loadTexture(`${uiAssets.pathPrefix}${v}${uiAssets.pathExt}`));
            }
        }
        return await Promise.all(assetsToLoad);
    }

    buildDayNight()
    {
        const sunSprite = AssetManager.getTexture(getAssetPath("sun"));
        const moonSprite = AssetManager.getTexture(getAssetPath("moon"));

        const sunMoonIcon = meshFromSprite(sunSprite, this.slotSize, this.slotSize);
        const btn = new UIButton(this.camera, () =>
        {
            this.timeManager.setDayTime(PlayerData.time == DayTime.day ? DayTime.night : DayTime.day);
            sunMoonIcon.material.map = PlayerData.time == DayTime.day ? sunSprite : moonSprite;

        },
        {
            onHover(){sunMoonIcon.scale.set(1.2, 1.2, 1.2);},
            onDown(){sunMoonIcon.scale.set(0.8, 0.8, 0.8);},
            onUp(){sunMoonIcon.scale.set(1, 1, 1);}
        });

        btn.add(sunMoonIcon)
        btn.position.x = GameSize.width / 2 - this.slotSize/4;
        btn.position.y = GameSize.height - this.slotSize;
        btn.name = "Sun";
        this.group.add(btn);
    }

    buildSoundToggle()
    {
        const soundOn = AssetManager.getTexture(getAssetPath("ui/sound_on"));
        const soundOff = AssetManager.getTexture(getAssetPath("ui/sound_off"));
        const soundVisual = meshFromSprite(soundOn, this.slotSize, this.slotSize);

        const soundButton = new UIButton(this.camera, () =>
        {
            PlayerData.soundVolume = PlayerData.soundVolume >= 1 ? 0 : 1;
            soundVisual.material.map = PlayerData.soundVolume >= 1 ? soundOn : soundOff;
            this.event.emitEvent(GameEvents.toggleSound, PlayerData.soundVolume);
        },
        (
            {
                onDown() { soundButton.scale.set(0.6, 0.6, 0.6);},
                onUp() { soundButton.scale.set(1,1,1);},
                onHover() { soundButton.scale.set(1.2,1.2,1.2);}
            }
        ));

        soundButton.add(soundVisual);
        soundButton.position.set(this.slotSize, GameSize.height-this.slotSize, 0);
        soundButton.name = "SoundButton";


        this.group.add(soundButton);
    }

    buildSkipDay()
    {
        const skipDayVisual = meshFromSprite(AssetManager.getTexture(getAssetPath("skip_day")), this.slotSize, this.slotSize);

        this.skipDay = new UIButton(this.camera, () => this.advanceDay(),
        {
            onDown() { skipDayVisual.scale.set(0.6,0.6,0.6) },
            onUp() { skipDayVisual.scale.set(1,1,1)},
            onHover(){ skipDayVisual.scale.set(1.2, 1.2, 1.2);}
        });
        this.skipDay.name = "SkipDay";
        this.skipDay.position.set(GameSize.width - this.slotSize, GameSize.height - this.slotSize);

        this.skipDay.add(skipDayVisual);
        this.group.add(this.skipDay);

    }

    advanceDay()
    {
        this.event.emitEvent(GameEvents.advanceDay);
    }



    build()
    {
        this.slotTexture = AssetManager.getTexture(getAssetPath("ui/default"));
        this.slotHoverTexture = AssetManager.getTexture(getAssetPath("ui/hover"));
        this.buildSoundToggle();
        this.buildSkipDay();
        this.buildDayNight();


        const items = [
            //Animals
            [
                ItemType.sheep,
                ItemType.cow,
            ],
            //Vegetables
            [
                ItemType.corn,
                ItemType.grape,
                ItemType.strawberry,
                ItemType.tomato,
            ]
        ];


        for(let i = 0; i < items.length; i++)
        {
            for(let j = 0;  j < items[i].length; j++)
            {
                const item = new UIItem(items[i][j], this.slotTexture, this.slotHoverTexture, this.camera,
                    () =>
                        {
                            this.setSelectedItem(items[i][j]);
                        }
                );
                item.build(this.slotSize, this.itemSize);
                item.position.set(this.slotSize*(j+1), this.slotSize*(i+1), 0);
                this.items.add(item);
            }
        }
        this.setSelectedItem(PlayerData.selected);
        this.msgBox = new UITextBox(this.camera);
        this.msgBox.position.set(GameSize.width / 2, GameSize.height / 2, 0);
        this.group.add(this.msgBox);
    }

    /**
     *
     * @param {ItemType[keyof ItemType]} item
     */
    setSelectedItem(item)
    {
        for(const it of this.items.children)
        {
            /** @type {UIItem} */
            const uiItem = it;
            uiItem.setState(uiItem.itemType == item ? ButtonState.disabled : ButtonState.up);
        }
        PlayerData.selected = item;
    }

    animate(){}
}



const ButtonState = Object.freeze({
    disabled: 0,
    up: 1,
    hovered: 2,
    down: 3
});

/**
 * @typedef {{geometry: TextGeometry, onPageAdvance: Function}} UITextBoxPage
 */

/**
 * This class extends Button because it will be a clickable area for 'continuing' the dialogue.
 * I've decided on using UIButton inside it because of the time given, so I can work on other things.
 */
export class UITextBox extends THREE.Group
{
    currentPage = -1;
    /** @type {UITextBoxPage[]} */
    pages = [];


    /**
     * @param {THREE.Camera} camera
     */
    constructor(camera)
    {
        super();
        this.camera = camera;
        this.visible = false;
        const bgTexture = AssetManager.getTexture(getAssetPath("ui/Headless"));
        this.bgMesh = meshFromSprite(bgTexture);

        const buttonWidth = 120;
        const buttonHeight = 60;

        this.okButton = UIButton.textButton(camera, ()=> this.advancePage(), "OK", bgTexture, buttonWidth, buttonHeight);
        this.okButton.position.x+= bgTexture.width /2 - buttonWidth / 2;
        this.okButton.position.y+= -bgTexture.height/2 + buttonHeight / 2;
        this.add(this.bgMesh, this.okButton);
    }

    getBoxWidth() { return this.bgMesh.material.map.width; }
    getBoxHeight() { return this.bgMesh.material.map.height; }

    static getGeometryForText(text)
    {
        return new TextGeometry(text, {font: AssetManager.getDefaultFont(), size: 32});
    }

    reset()
    {
        this.pages.length = 0;
        this.currentPage = -1;
    }

    /**
     * Adds a page to be played by the tutorial or other kind of input.
     * @param {string} text The text of this page
     * @param {Function} onPageAdvance A page advance handler. Useful for playing animations together
     */
    addPage(text, onPageAdvance)
    {
        const page = {
            geometry: UITextBox.getGeometryForText(text),
            onPageAdvance
        };
        this.pages.push(page);
        if(!this.pageMesh)
        {
            this.pageMesh = new Mesh();
            this.pageMesh.position.x-= this.bgMesh.material.map.width / 2 ;
            this.pageMesh.position.y+= this.bgMesh.material.map.height / 2 ;
            this.add(this.pageMesh);
        }
    }

    getPageNumber() { return this.currentPage; }
    getPagesCount() { return this.pages.length; }

    hide()
    {
        tweenWithOnProgress(0.5, (p) =>
        {

        }, 'elastic.out');
    }

    advancePage()
    {
        if(this.currentPage + 1 >= this.pages.length)
        {
            this.visible = false;
            return;
        }

        this.visible = true;
        const pg = this.pages[++this.currentPage];
        this.pageMesh.geometry = pg.geometry;
        const sz = getGeometrySize(this.bgMesh.geometry);
        textAlignToCenter(this.pageMesh.geometry, sz.width, sz.height);
        if(pg.onPageAdvance)
            pg.onPageAdvance();
    }
}

export class UIButton extends THREE.Group
{
    /**
     *
     * @param {THREE.Camera} camera
     * @param {Function} onClick
     * @param {{
     *  onHover?: Function,
     *  onDisabled?: Function,
     *  onUp?: Function,
     *  onDown?: Function
     * }} handlers
     */
    constructor(camera, onClick, handlers)
    {
        super();
        this.camera = camera;
        this.state = ButtonState.up;
        this.onClick = onClick;

        this.onHover = handlers.onHover;
        this.onDisabled = handlers.onDisabled;
        this.onUp = handlers.onUp;
        this.onDown = handlers.onDown;
        MouseEvents.get().addHandler(this);
    }
    /**
     *
     * @param {THREE.Camera} camera
     * @param {Function} onClick On click for that text button
     * @param {string} text What is its default content
     * @param {THREE.Texture} texture Background texture for the button
     * @param {number} width Background width
     * @param {number} height Background height
     * @returns {UIButton}
     */
    static textButton(camera, onClick, text, texture, width, height)
    {
        const sprite = meshFromSprite(texture, width, height);
        sprite.material.color.setHex(0xaaaaaa);
        const ret = new UIButton(camera, onClick, {
            onDown()
            {
                sprite.material.color.setHex(0x888888);
                sprite.scale.set(0.9, 0.9, 0.9);
            },
            onHover()
            {
                sprite.material.color.setHex(0xffffff);
                sprite.scale.set(1,1,1);
            },
            onUp()
            {
                sprite.material.color.setHex(0xaaaaaa);
                sprite.scale.set(1,1,1);
            }
        });

        const txt = new Mesh(new TextGeometry(text, {font: AssetManager.getDefaultFont(), size: height/2}));
        txt.position.x-= width/2;
        textAlignToCenter(txt.geometry, width ,height);
        sprite.add(txt);
        ret.add(sprite);
        return ret;
    }

    onMouseDown(mouse)
    {
        if(this.isDisabled() || !this.hitTest(mouse))
            return false;
        this.setState(ButtonState.down);
        return true;
    }

    onMouseUp(mouse)
    {
        if(this.isDisabled())
            return false;

        if(this.state == ButtonState.down)
        {
            this.setState(ButtonState.up);
            if(this.onClick)
                this.onClick();
            return true;
        }
        return false;
    }


    /**
     * @param {THREE.Vector2} mouse
     */
    onMouseMove(mouse)
    {
        if(this.isDisabled())
            return false;
        if(this.state != ButtonState.down)
            this.setState(this.hitTest(mouse) ? ButtonState.hovered : ButtonState.up);
        return false;
    }
    getState() { return this.state; }

    /**
     * @param {Readonly<THREE.Vector2>} mouse
     * @returns {boolean}
     */
    hitTest(mouse)
    {
        gRaycaster.setFromCamera(mouse, this.camera);
        const intersects = gRaycaster.intersectObjects(this.children, true, gIntersects());
        return intersects.length != 0;
    }

    isDisabled() { return this.state == ButtonState.disabled; }

    setState(btnState)
    {
        if(this.state != btnState)
        {
            switch(btnState)
            {
                case ButtonState.disabled:
                    if(this.onDisabled) this.onDisabled();
                    break;
                case ButtonState.up:
                    if(this.onUp) this.onUp();
                    break;
                case ButtonState.hovered:
                    if(this.onHover) this.onHover();
                    break;
                case ButtonState.down:
                    if(this.onDown) this.onDown();
                    break;
            }
            this.state = btnState;
        }
    }
}

class UIItem extends UIButton
{
    /**
     * @param {ItemType[keyof ItemType]} itemType
     * @param {THREE.Texture} defaultTexture The default texture when not hovered
     * @param {THREE.Texture} hoverTexture Hover texture
     * @param {THREE.Camera} camera
     * @param {Function} onClick
     */
    constructor(itemType = ItemType.cow, defaultTexture, hoverTexture, camera, onClick)
    {
        super(camera, onClick, {
            onHover: () =>
            {
                this.children[0].material.map = this.hoverTexture;
                this.children[0].material.color.setHex(0xffffff);
                this.children[0].children[0].material.color.setHex(0xffffff);
            },
            onUp: () =>
            {
                this.children[0].material.map = this.defaultTexture;
                this.children[0].material.color.setHex(0xffffff);
                this.children[0].children[0].material.color.setHex(0xffffff);
            },
            onDisabled: () =>
            {
                this.children[0].material.map = this.hoverTexture;
                this.children[0].material.color.setHex(0xaaaaaa);
                this.children[0].children[0].material.color.setHex(0xaaaaaa);
            }
        });
        this.itemType = itemType;
        this.defaultTexture = defaultTexture;
        this.hoverTexture = hoverTexture;
    }

    /**
     *
     * @param {number} slotSize Size of the slot. Usually bigger than item
     * @param {number} itemSize Size of the item
     * Builds that UI Item to be shown.
     */
    build(slotSize, itemSize)
    {
        const slot = meshFromSprite(this.defaultTexture, slotSize, slotSize);
        const icon = meshFromSprite(textureFromItem(this.itemType), itemSize, itemSize);
        slot.add(icon);
        this.add(slot);
    }

}

/**
 *
 * @param {ItemType[keyof ItemType]} itemType
 */
function textureFromItem(itemType)
{
    switch(itemType)
    {
        //Animals
        case ItemType.cow:
            return AssetManager.getTexture(getAssetPath("cow"));
        case ItemType.sheep:
            return AssetManager.getTexture(getAssetPath("sheep"));
        //Vegetables
        case ItemType.corn:
            return AssetManager.getTexture(getAssetPath("corn"));
        case ItemType.grape:
            return AssetManager.getTexture(getAssetPath("grape"));
        case ItemType.strawberry:
            return AssetManager.getTexture(getAssetPath("strawberry"));
        case ItemType.tomato:
            return AssetManager.getTexture(getAssetPath("tomato"));
        default:
            throw new Error(`Invalid ItemType ${itemType}`);
    }
}