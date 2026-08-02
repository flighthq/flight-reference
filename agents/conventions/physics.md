# Box2D Conversion

Box2D demos port to `@flighthq/physics2d`, not to a Box2D binding. The solver is a different one, so match the setup and the observable behaviour, not the trajectories.

## Density is not optional

`b2FixtureDef` defaults `density` to 0, and Box2D covers for it: a dynamic body that would weigh nothing is promoted to a mass of 1. Its rotational inertia stays 0, so such a body falls but can never rotate. Plenty of samples rely on that without saying so — the Haxe Box2D sample creates every fixture with the default and never sets a density.

Flight derives mass strictly from collider area and density and does not promote. Carry the source's density of 0 across and every dynamic body gets an inverse mass of 0, which reads as a scene where nothing falls at all. Give Flight a real density instead. The body then also gains the rotational inertia Box2D's promotion skipped, so it can tip and roll where the source could only slide.

## Order of construction

Mass is derived when the body joins the world, so push every collider onto `body.colliders` before `addPhysics2DBody`. A body added empty and populated afterwards keeps a mass of 0.

## Gravity sign

Box2D samples written against a display list use screen-space axes, where y grows downward and gravity is positive. `createPhysics2DWorld` defaults to `(0, -9.81)` for a y-up world. Pass the source's positive value explicitly when the scene keeps screen-space coordinates.

## Step with a fixed dt

Step by a constant, the way the source's `ENTER_FRAME` handler does — not by the frame's real delta. The capture harness halts on a fixed frame number rather than a fixed elapsed time, so a sim advanced by wall-clock produces a different baseline on every run.

Note that this makes the sim frame-locked rather than time-locked: two columns whose pages tick at different frame rates stay identical per step while drifting apart in wall-clock time. Compare them at rest, or per step, not by eye mid-motion.
