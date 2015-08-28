var sw = require('./steamweb')('4D1FCD8C86BC1A0CD071A0F1355EE5D9');

var currentList = Array();
var version = 0;

var checked = {};
var totalChecked = 0;

var COUNT = 5;

function searchId(id) {
    sw.friends(id, function(err, people) {
        var friends = people.friends;
        var cVersion = version;
        for (f in friends) {
            if (checked[friends[f].steamid]) continue;
            sw.summary(friends[f].steamid, function(err, summ) {
                summ = summ.players[0];
                checked[summ.steamid] = true;
                totalChecked++;
                if (summ.gameid == 440) {
                    if (cVersion == version) {
                        currentList.push(summ.steamid);
//                         console.log('pushing ' + summ.steamid);
                        if (currentList.length == COUNT) {
                            version++;
                            COUNT = 20;
                            console.log('new version: ' + version + '. Found ' + totalChecked);
                            for (var c in currentList) {
                                searchId(currentList[c]);
                            }
                            currentList = Array();
                        }
                    }
                    sw.items(440, summ.steamid, function(err, items) {
                        items = items.items;
                        for (var i in items) {
                            if (items[i].defindex == 5817) {
                                console.log('http://steamcommunity.com/profiles/' + summ.steamid);
                            }
                        }
                    });
                }
            });
        }
    });
}

searchId('76561198130148331');