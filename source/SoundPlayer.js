import { AssetManager } from "./AssetManager";
import { GameEventEmitter, GameEvents } from "./GameEventEmitter";
import { ItemType } from "./globals";
import { PlayerData } from "./PlayerData";

const Sounds = {
    click: "assets/sounds/click_003.mp3",
    sheep: "assets/sounds/sheep.mp3",
    cow: "assets/sounds/cow.mp3",
    music: "assets/sounds/theme.mp3"
}

/**
 * Responsible for playing the sounds, but instead of using an interface to call it, instead,
 * it uses the event emitter to listen to the game events and respond it with the expected sounds.
 */
export class SoundPlayer
{
    /** @type {Howl[]} */
    playingAudio = [];

    /**
     * @param {GameEventEmitter} events 
     */
    constructor(events)
    {
        this.events = events;
        this.playAudio(Sounds.music, true);

        events.addListener(GameEvents.spawnUnit, (itemType) =>
        {
            switch(itemType)
            {
                case ItemType.sheep:
                    this.playAudio(Sounds.sheep);
                    break;
                case ItemType.cow:
                    this.playAudio(Sounds.cow);
                    break;
                default: break;
            }
        });
        events.addListener(GameEvents.toggleSound, (volume) =>
        {
            this.setAudioVolume(volume);
        });
        events.addListener(GameEvents.click, (pos) =>
        {
            this.playAudio(Sounds.click);
        });
    }

    setAudioVolume(vol)
    {
        for(let i = this.playingAudio.length - 1; i >= 0; i--)
        {
            const v = this.playingAudio[i];
            v.volume(vol);
            if(!v.playing())
                this.playingAudio.length--;
        }
    }
    /**
     * Plays a managed audio
     * @param {string} audio The Audio path to get from the asset manager
     * @param {boolean} loops If the audio loops, it won't be removed from playing audio list
     * @returns {Howl}
     */
    playAudio(audio, loops = false)
    {
        const track = AssetManager.getAudio(audio);
        track.volume(PlayerData.soundVolume);
        track.loop(loops);
        this.playingAudio.push(track);
        track.play();
        return track;
    }

    static async loadAssets()
    {
        return Promise.all(Object.values(Sounds).map((v) => AssetManager.loadAudio(v)));
    }


}