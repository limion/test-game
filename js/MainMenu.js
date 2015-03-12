var TopDownGame = TopDownGame || {};

//title screen
TopDownGame.MainMenu = function(){};

TopDownGame.MainMenu.prototype = 
{
    init: function(score) 
    {
        var score = score || 0;
        this.highestScore = this.highestScore || 0;

        this.highestScore = Math.max(score, this.highestScore);
    },
    
    create: function() {
        //show the space tile, repeated
        this.background = this.game.add.tileSprite(0, 0, this.game.width, this.game.height, 'bg');

        //give it speed in x
        this.background.autoScroll(-20, 0);

        //start game text
        /*var text = "Для начала игры кликните мышкой";
        var style = { font: "30px Arial", fill: "#555", align: "center" };
        var t = this.game.add.text(this.game.width/2, this.game.height/2, text, style);
        t.anchor.set(0.5);*/
        
        var crossing1 = this.add.button(this.world.centerX - 95, 100, 'button', this.crossing1Level, this, 2, 1, 0),
            crossing2 = this.add.button(this.world.centerX - 95, 200, 'button', this.crossing2Level, this, 2, 1, 0);

        //highest score
        text = "Лучший счет: "+this.highestScore;
        style = { font: "15px Arial", fill: "#555", align: "center" };

        var h = this.game.add.text(this.game.width/2, this.game.height/2 + 50, text, style);
        h.anchor.set(0.5);
        
        var vkUser = this.game.add.text(this.game.width/2, this.game.height/2 + 75, TopDownGame.vkData.user.first_name+' '+TopDownGame.vkData.user.last_name, style).anchor.set(0.5);;
        this.game.add.image(this.game.width/2, this.game.height/2 + 100,'userpic').anchor.set(0.5);
        
        if (this.game.properties === undefined) {
            /*this.bgSound = this.game.add.audio('soundtrack');
            this.bgSound.play('',0,1,true);
            this.game.properties = {
                bgSound: this.bgSound
            }*/
        }
        else {
            this.game.properties.bgSound.restart('',0,1,true);
        }
        
    },
    
    update: function() {
        /*if(this.game.input.activePointer.justPressed()) {
          this.game.state.start('Game');
        }*/
    },
    
    crossing1Level: function() {
        this.game.state.start('Game',true,false,'level3');
    },
    
    crossing2Level: function() {
        this.game.state.start('Game',true,false,'level4');
    },
};