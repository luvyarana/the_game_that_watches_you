# The Game That Watches You

*A psychological, adaptive maze escape game built for the **CodeDay Hackathon**!*

## About The Game
"The Game That Watches You" is not a static challenge. It is an evolving simulation that models its geometry and difficulty around **your** psychology. 

As you navigate through 7 massive, exponentially difficult levels to reach the pulsing green exit gate, the game's engine privately tracks your every movement, death count, and idle hesitation.

- **Act recklessly?** The traps will adjust their speed to match and punish your impatience.
- **Stand still in fear?** The system detects idleness and spawns traps specifically to force you into motion.
- **Move predictably?** Predictive tracking traps will calculate your velocity vectors and move to intercept you.

The game isn't just trying to beat you it is trying to *understand* you. In the end, if you survive the massive 7th stage, the simulation will reveal your psychological profile based on your telemetry data.

## Features
- 🚀 **Real Time Adaptation**: The game dynamically shifts speeds and spawns based on your playstyle.
- 📐 **Exponential Scaling**: Each of the 7 levels grows exponentially larger, housing hundreds of static, moving, and predictive geometry traps.
- 🧭 **Dynamic Tracking HUD**: Large levels require navigation. The UI actively calculates and displays your relative `[X, Y]` displacement to the exit gate, and an orbit tracker arrowhead points the way.
- 🎨 **Minimalist Contrast UI**: High contrast, core lit geometries to keep your eyes focused on the escape.

## Controls
- **WASD** or **Arrow Keys** to move.
- **SPACEBAR** to begin the simulation.

## Run Locally
This game is built entirely with Vanilla HTML, CSS, and JS. Zero dependencies.
1. Clone the repository.
2. Open `index.html` in your favorite web browser.
3. Escape.
