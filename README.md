# 3D Garden 
This project was made using the following tech stack

- ThreeJS
- GSAP
- Howler.js
- ESBuild


## Structure

### JavaScript decision
It was aimed at having the bare minimum, and thus, it was made in JavaScript instead of my preference, which is TypeScript. I heavily relied on using JSDoc for giving type hint.

On the comments, I've done the bare minimum for mostly the main pieces of the structure.
Since I didn't had much time to do it, I've tried using a good structure for a small project and making it easily extensible.

Its most important components are:

- Garden
- GameEventEmitter
- PlayerController
- UI

Since I prefer using only game code instead of web code, I've coded also a minimal 2D UI on top of ThreeJS, which relies on basic-input.js + UI.js
