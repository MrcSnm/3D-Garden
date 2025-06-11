import { Group, Scene } from "three";
import { AssetManager } from "./AssetManager"
import { MouseEvents } from "./basic-input";
import { meshFromSprite, tweenWithOnProgress } from "./utils";
import { GameSize } from "./globals";
import { UI } from "./UI";


const TutorialAssets = {
    fingerUp: "assets/images/ui/finger_up.png",
    fingerDown: "assets/images/ui/finger_down.png"
}


const ActionType = {
    click: 0,
    reset: 1,
    /**
     * Special action that shows the msgBox, and accepts an additional field 'actions', which is
     * executed until the user hits OK
     */
    msgBoxShow: 2,
    msgBoxHide: 3,
    hide: 4,
    show: 5,
    instantHide: 6,
    instantShow: 7,
    setPosition: 8
}

/**
 * @typedef {{action: ActionType.setPosition, x?: number, y?: number}} SetPositionAction
 */
/**
 * @typedef {{position?: string, x?: number, y?: number, duration?: number}} MoveToAction
 */

/**
 * @typedef {(SetPositionAction | ActionType[keyof ActionType] | MoveToAction)[]} ActionList
 */


const Actions = {
    /** @type {ActionList} */
    moveToSlot : [
        {action: ActionType.setPosition, x: 807, y: 604},
        {x: 550, y: 180},
        ActionType.click,
        ActionType.reset
    ],
    /** @type {ActionList} */
    moveToMute: [
        {position: "SoundButton",  y: -65, x: 32},
        ActionType.click,
        ActionType.reset
    ],
    /** @type {ActionList} */
    moveToSun: [
        {position: "Sun",  y: -65, x: 32},
        ActionType.click,
        ActionType.reset
    ],
    /** @type {ActionList} */
    moveToSkip: [
        {position: "SkipDay",  y:-65, x: 32},
        ActionType.click,
        ActionType.reset
    ],
    /** @type {ActionList} */
    finish: [
        ActionType.hide,
        ActionType.instantHide
    ]
}

/**
 * @typedef {{actions: ActionList, message?: string}[]} TutorialSteps
 */


/**
 * @type {TutorialSteps} The only tutorial in the game
 */
export const StartTutorial = [
    {
        actions: Actions.moveToSlot,
        message: "Select either a crop or an\nanimal"
    },
    {
        actions: Actions.moveToMute,
        message: "You can toggle the sound by\nclicking there"
    },
    {
        actions: Actions.moveToSun,
        message: "It is also possible to switch\nbetween day and night",
    },
    {
        actions: Actions.moveToSkip,
        message: "By clicking on skip, the crops\nevolve one growth level"
    },
    {
        actions: Actions.finish,
        message: "Now close this dialogue and \nbuild your garden!"
    },
    {
        /** Guarantees to execute the instant hide if the player clicks too fast */
        actions: [ActionType.instantHide]
    }
]

/**
 * The tutorial is an interface running inside the UI
 * It is able to play arbitrary actions by following the style at {@link Actions} as that
 * is much easier to define and modify at a later stage. That system is easily extensible
 */
export class Tutorial extends Group
{
    static async loadAssets()
    {
        return Promise.all(Object.values(TutorialAssets).map((v) => AssetManager.loadTexture(v)));
    }
    /** @type {gsap.core.Tween} */
    currentTween = null;
    /** @type {Function} The resolve of the current promise*/
    currentPromise = null;

    /** @type {boolean} Used for repeating actions, and that condition will be controlled by that variable */
    canAdvanceReset = false;

    /**
     * @param {UI} ui
     */
    constructor(ui)
    {
        super();
        this.ui = ui;
        this.mesh = meshFromSprite(AssetManager.getTexture(TutorialAssets.fingerUp));
        this.add(this.mesh);
    }

    /**
     *
     * @param {TutorialSteps} tutorial The steps to play
     */
    async playTutorial(tutorial)
    {
        this.ui.msgBox.reset();
        for(const v of tutorial)
        {
            if(v.message)
                this.ui.msgBox.addPage(v.message, () => this.stopCurrentAction());
        }
        this.ui.msgBox.advancePage();
        for await(const v of tutorial)
        {
            this.canAdvanceReset = false;
            await this.playAction(v.actions);
        }

    }

    instantHide()
    {
        this.scale.set(0);
    }
    instantShow()
    {
        this.scale.set(1);
    }
    async show()
    {
        if(this.scale.x >= 1)
            return;
        return this.getTweenWithOnProgress(0.2, (p) =>
        {
            this.scale.set(p,p,p);
        }, 'none');
    }

    async hide()
    {
        if(this.scale.x == 0)
            return;
        return this.getTweenWithOnProgress(0.2, (p) =>
        {
            p = 1-p;
            this.scale.set(p,p,p);
        }, 'none');
    }

    /**
     *
     * @param {number} duration Duration for the tween
     * @param {(progress: number) => void} onProgress onProgress to execute
     * @param {string} ease
     * @param {Function} onComplete
     * @returns {Promise<void>} The promise executing the tween
     */
    async getTweenWithOnProgress(duration, onProgress, ease = "none", onComplete)
    {
        return new Promise((res) =>
        {
            this.currentPromise = res;
            this.currentTween = tweenWithOnProgress(duration, onProgress, ease, () =>
            {
                if(onComplete) onComplete();
                res();
            });
        });
    }

    /**
     *
     * @param {ActionList} act
     */
    async playAction(act)
    {
        this.canAdvanceReset = false;
        for await(const v of Object.values(act))
        {
            if(this.canAdvanceReset)
                return;
            if(typeof(v) == 'number')
            {
                switch(v)
                {
                    case ActionType.click:
                        await this.click();
                        break;
                    case ActionType.show:
                        await this.show();
                        break;
                    case ActionType.instantShow:
                        this.instantShow();
                        break;
                    case ActionType.hide:
                        await this.hide();
                        break;
                    case ActionType.instantHide:
                        this.instantHide();
                        break;
                    case ActionType.reset:
                        if(!this.canAdvanceReset)
                            await this.playAction(act);
                        break;
                }
            }
            else
            {
                if(v.action && v.action == ActionType.setPosition)
                    this.position.set(v.x, v.y, 1);
                else
                {
                    if(v.position)
                    {
                        const pos = this.ui.group.getObjectByName(v.position).position;
                        let x = pos.x, y = pos.y;
                        if(v.x) x+= v.x;
                        if(v.y) y+= v.y;
                        await this.moveTo(x, y, v.duration) ;
                    }
                    else
                        await this.moveTo(v.x, v.y, v.duration);
                }
            }
        }
    }

    stopCurrentAction()
    {
        this.canAdvanceReset = true;
        if(this.currentPromise)
        {
            const currPromise = this.currentPromise;
            this.currentPromise = null;
            currPromise();
        }
        if(this.currentTween)
        {
            this.currentTween.kill();
            this.currentTween = null;
        }
    }


    /**
     * @param {number} x Target X in the camera.
     * @param {number} y Target Y in the camera
     */
    async moveTo(x, y, duration = 1)
    {
        const initX = this.position.x, initY = this.position.y;
        return this.getTweenWithOnProgress(duration, (p) =>
        {
            this.position.set((1-p)*initX + p*x, (1-p)*initY + p*y, 1);
        }, 'none');
    }

    async click()
    {
        this.mesh.material.map = AssetManager.getTexture(TutorialAssets.fingerDown);
        return this.getTweenWithOnProgress(0.2, () => {}, 'none', () =>
        {
            this.mesh.material.map = AssetManager.getTexture(TutorialAssets.fingerUp);
        });
    }

}