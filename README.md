# WH40K-Game-Table
Building a complete gaming control table for Warhammer 40K

## Game Flow and Design

(./WH40k game flow.jpg)
As show in the rough game flow diagram, 

## RFID Tracker Portion
- Multiple RFID readers (Current version are the SL018, Ref: https://github.com/michaelkroll/BT-RFID-Reader/blob/master/arduino/lib/SL018/README)

(./WH40K Table.jpg)


RFID Readers are placed across the bottom of the board. Each individual unit has an RFID tag on it with a unique ID linked to the stats in the database on the server. The readers will read the tags and report the dB of the tags to the various readers allowing the triangulation of the piece on the board. End goal is to have the system recognize the location of the pieces and report it on the tablets on the board allowing players to select units on their tablet and have them highlight the location on the board as well as highlight the stats of the units on the tablets.