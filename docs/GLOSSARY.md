# Watchpoint

Watchpoint is an interactive coaching and learning platform where admins author tactical VOD curricula, and users test and sharpen their decision-making.

## Language

### Core Domain

**VOD**:
A recorded gameplay or instructional video asset backed by YouTube that serves as the basis for user lessons.
_Avoid_: Match, Recording, Tape

**Published VOD**:
A VOD made available for Users to discover and use in Lessons. Published VODs appear in the VOD Catalog.
_Avoid_: Public VOD, Listed VOD

**VOD Catalog**:
The user-facing collection where Users discover Published VODs and see each VOD's duration, Question count, and Skills represented by its Questions.
_Avoid_: Learning library, Video library, Playlist

**Lesson**:
A user's active learning run through a VOD where they are presented with interactive questions at specific timestamps.
_Avoid_: Playthrough, Session, Run, Drill, Review, Assignment

**Question**:
An interactive challenge anchored to a specific timestamp in a VOD that prompts the user to make a tactical decision.
_Avoid_: Scenario, Prompt, Decision Point, Quiz item

**Option**:
An individual selectable response choice belonging to a Question, with one designated as correct.
_Avoid_: Choice, Alternative, Multiple-choice item

**Answer**:
A user's submitted response to a Question, recording their selected Option, correctness, time elapsed, and an immutable snapshot of the Question.
_Avoid_: Attempt, Submission, Response

**Skill**:
A tactical competency category that categorizes Questions (e.g. Strategy, Tactics, Tracking, Spatial).
_Avoid_: Training module, Category, Discipline, Tag

### Roles

**User**:
A person who watches VODs, takes Lessons, and reviews their historical performance.
_Avoid_: Student, Learner, Player, Consumer

**Admin**:
An administrator who manages VODs, authors Questions and Options, and configures user roles.
_Avoid_: Instructor, Coach, Manager, Creator

### Components & UI Taxonomy

**Leaf Component**:
A presentational component at the bottom of the render tree that renders standard HTML/DOM elements without composing other custom components.
_Avoid_: Dumb component, primitive, terminal component

**Orchestrator Component**:
A component that orchestrates domain state, user interactions, or mutations and delegates visual presentation to child components.
_Avoid_: Container component, smart component, controller component, screen controller

### Architecture

**Seam**:
The public boundary or interface where callers and tests observe behavior without reaching inside internal implementation details.
_Avoid_: Boundary, internal interface
