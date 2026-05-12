# WH40K-Game-Table
Building a complete gaming control table for Warhammer 40K

## Game Flow and Design

![game flow](https://github.com/tomatotux/WH40K-Game-Table/blob/main/WH40k%20game%20flow.jpg)
As show in the rough game flow diagram: 

1. Admin sets up the map, location of the control points, terrain locations etc via RDP. This will be shown in the app on tablets and the map will be shown via the projectors
2. Player selects the army from the options and the associated units to be fielded via tablet. 
3. During game play, the players can select the units in their army to see movement and shoot options on their tablet as well as a list of statistics for the units selected.


## RFID Tracker Portion
- Multiple RFID readers (Current version are the SL018, Ref: https://github.com/michaelkroll/BT-RFID-Reader/blob/master/arduino/lib/SL018/README)

![table rfid reader location](https://github.com/tomatotux/WH40K-Game-Table/blob/main/WH40K%20Table.jpg)


RFID Readers are placed across the bottom of the board. Each individual unit has an RFID tag on it with a unique ID linked to the stats in the database on the server. The readers will read the tags and report the dB of the tags to the various readers allowing the triangulation of the piece on the board. End goal is to have the system recognize the location of the pieces and report it on the tablets on the board allowing players to select units on their tablet and have them highlight the location on the board as well as highlight the stats of the units on the tablets.

## Needs for development
 - Testing and completion of measures for the RFID readers to verify triangulation function
 - Review existing projects for army builders and potentially fork the DB references and link to RFID tags
	 - Review <a href=https://furka.github.io/40k-10th-list-builder/>Furka's List Builder
	 - Review <a href=https://github.com/BSData/wh40k-10e/>BSData List Builder
	 - Review <a href=https://www.newrecruit.eu/app/MyLists/>NewRecruit List Builder
 - Find way to designate the size of the board as a reference for the application in performing the math calculations
 - Build web server
	 - Player interface for Tablets

## Architecture Plan:

Backend: Node.js + Express + SQLite (via better-sqlite3)
Frontend: Vanilla HTML/CSS/JS with a dark Warhammer 40K aesthetic
Views: GM Map View (displays map image) + Tablet Portal (character selection & stats)
Session System: Temporary modifiers tracked in memory/session table, reverted on session end
Docker: docker-compose with the Node app

## Architecture
wh40k-server/
├── Dockerfile              # Alpine Node.js 20 image
├── docker-compose.yml      # One-command deployment
├── package.json
└── src/
    ├── server.js           # Express + Socket.IO server
    ├── db/database.js      # SQLite schema + seed data
    ├── routes/
    │   ├── characters.js   # Full CRUD for units/weapons
    │   ├── sessions.js     # Session + modifier management
    │   └── factions.js     # Faction CRUD
    └── public/
        ├── index.html      # Landing portal
        ├── gm.html         # GM Command view
        ├── tablet.html     # Player tablet view
        ├── admin.html      # Database admin panel
        ├── css/shared.css  # Full WH40K Gothic aesthetic
        └── js/shared.js    # API + toast helpers

##🚀 Deployment
bashtar -xzf wh40k-server.tar.gz
cd wh40k-server
docker-compose up -d
Then visit http://YOUR-IP:3000 from any device on your network.

##🎮 How It Works
ViewURLPurposeHome/Portal selectorGM Console/gmMap display (pan/zoom), session control, unit overviewTablet Portal/tabletPlayers select their unit, apply modifiers, toggle conditionsAdministratum/adminFull character/faction/weapon database editor

##🔑 Key Design Decisions

Temporary modifiers are stored as deltas in a session_modifiers table — the characters table is never touched during play. When the GM ends a session, all modifier rows are deleted — stats revert automatically.
Real-time sync via Socket.IO — when a tablet changes a wound count or adds a condition, all other tablets and the GM view update instantly.
8 pre-seeded characters across Space Marines, Chaos, Orks, and Necrons to get you started immediately.
Map pan & zoom with mouse drag and scroll wheel on the GM view.
Data persistence via a named Docker volume — the SQLite database and uploaded maps survive container restarts.
