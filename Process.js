var PROCESS = PROCESS || {};
/**
 * Processes the specified data
 * @param  {any} data The data to process
 */
PROCESS.process = function(data) {
  var zip = new JSZip();
  var grouped = PROCESS.group(data);
  var durationCsv = PROCESS.duration(grouped);
  zip.file('duration.csv', durationCsv);
  var folder = zip.folder('performance-data');
  for (var id in grouped) {
    var performanceCsv = PROCESS.performance(grouped[id]);
    folder.file('performance-' + id + '.csv', performanceCsv);
  }
  // zip and save
  var content = zip.generate({type:"blob"});
  var foldername = new Date().toGMTString() + '.zip';
  saveAs(content, foldername);
};
/**
 * Returns a .csv file containing the total duration played for each unique id
 * in the specified data
 * @param  {[any]} data  The games
 * @return {string}      The .csv file
 */
PROCESS.duration = function(data) {
  var csv = 'id,duration\n';
  for (var id in data) {
    var playerData = data[id];
    var duration = 0;
    for (var game in playerData) {
      var currentGame = playerData[game];
      var waves = JSON.parse(currentGame.waves);
      for (var wave in waves) {
        if (!isNaN(waves[wave].duration) && (waves[wave].duration < 10000000)) { // for some reason, one wave has a duration > 10000000, so ignore it
          duration += waves[wave].duration;
        }
      }
    }
    var durationInMinutes = ((duration) / (1000 * 60)).toFixed(2);
    csv = csv + id + ',' + durationInMinutes + '\n';
  }
  return csv;
};
/**
 * Returns an associative array containing the games specified in data, grouped
 * by playerId
 * @param  {[any]} data  The games
 * @return {any}         The games, grouped by id
 */
PROCESS.group = function(data) {
  var sorted = {};
  for (var result in data.results) { // get all results for the id
    var id = data.results[result].playerId;
    if (!sorted[id]) {
      sorted[id] = [data.results[result]];
    } else {
      sorted[id].push(data.results[result]);
    }
  }
  return sorted;
};
/**
 * Returns a .csv file containing the performance data for the specified games
 * @param  {[any]} data  The games
 * @return {string}      A .csv file containing the performance data
 */
PROCESS.performance = function(data) {
  // sort by time created
  data.sort(function(game1, game2){
    var date1 = new Date(game1.createdAt);
    var date2 = new Date(game2.createdAt);
    return new Date(date1) - new Date(date2);
  });
  // build a csv file
  var csv = 'Game,Block length,Wave,Total number of creatures,Percentage targets,Uniformity,Success rate\n';
  for (var game in data) {
    var waves = JSON.parse(data[game].waves);
    var blockLength = PROCESS.patchBlockLength(data[game]); // patch the blocklength
    for (var wave in waves) {
      var settings = waves[wave].difficultySetting.split(':');
      csv += (parseInt(game) + 1) + ',' +		  // the game number
             blockLength + ',' +  // the block length
             (parseInt(wave) + 1) + ',' +     // the wave number
             settings[0] + ',' +		// the total num of creatures
             settings[1] + ',' +		// the % targets
             settings[2] + ',' +		// the uniformity
             waves[wave].successRate + // the success rate
             '\n';
    }
  }
  return csv;
};
/**
 * Returns the blocklength for the specified game.
 * During the first round of the evaluation, the blocklengths were set
 * incorrectly for the control group (blocklengths should always be 12 for the
 * control group). The first round of the evaluation was completed before
 * 01/03/2016
 * @param  {any} game    A TASTER game
 * @return {number}      The block length for the game
 */
PROCESS.patchBlockLength = function(game) {
  var cutoff = new Date(2016, 2, 1); // 01/03/2016
  var gameDate = new Date(game.createdAt);
  var ids = ['6633', '5697', '7535']; // the ids from the round 1 control group
  if ((ids.indexOf(game.playerId) > -1) && (gameDate.getTime() < cutoff.getTime())) {
    return 12;
  } else {
    return game.blockLength;
  }
};
