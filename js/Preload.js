var TopDownGame = TopDownGame || {};

//loading the game assets
TopDownGame.Preload = function(){};

TopDownGame.Preload.prototype = {
  preload: function() {
    //show loading screen
    this.preloadBar = this.add.sprite(this.game.world.centerX, this.game.world.centerY, 'preloadbar');
    this.preloadBar.anchor.setTo(0.5);

    this.load.setPreloadSprite(this.preloadBar);

    //load game assets
    this.load.tilemap('level3', 'assets/tilemaps/level3.json', null, Phaser.Tilemap.TILED_JSON);
    this.load.tilemap('level4', 'assets/tilemaps/level4.json', null, Phaser.Tilemap.TILED_JSON);
    this.load.image('gameTiles', 'assets/images/tmw_desert_spacing.png');
    this.load.image('bg', 'assets/images/desert_tile.png');
    this.load.spritesheet('car', 'assets/images/car90t.png',32,32);
    this.load.image('crossing', 'assets/images/beam.png');
    this.load.spritesheet('signal', 'assets/images/trafficlight_ui.png',150,250,2);
    this.load.spritesheet('button', 'assets/images/button_sprite_sheet.png', 193, 71);
    this.load.audio('goal', ['assets/audio/coin.ogg', 'assets/audio/coin.mp3']);
    this.load.audio('crash', 'assets/audio/explosion.ogg');
    this.load.audio('light', 'assets/audio/menu_switch.mp3');
    //this.load.audio('soundtrack', ['assets/audio/bodenstaendig_2000_in_rock_4bit.ogg', 'assets/audio/bodenstaendig_2000_in_rock_4bit.mp3']);
  },
  create: function() {
    this.state.start('MainMenu');
  }
};