'use strict';

/*!
 * Module dependencies.
 */
var util = require('util');
var events = require("events");
var path = require('path');
var glob = require('glob');
var colors = require('colors');
var spawn = require('child_process').spawn;

/**
 * Exports
 */
module.exports = exports = helmsman;
exports.Helmsman = Helmsman;


function err(mes) {
  util.error(mes.red);
  process.exit(1);
}

/**
 * The Helmsman constructor
 *
 * Options:
 *
 *   * prefix: The prefix of the script files. eg: 'git-''
 *
 * @param  {object} options   config
 */
function Helmsman(options){
  var self = this;

  events.EventEmitter.call(self);

  if (!options) { options = {}; }

  if (!options.localDir) {
    this.localDir = path.dirname(module.parent.filename);
  } else {
    this.localDir = path.resolve(options.localDir);
  }

  this.prefix = options.prefix || path.basename(process.argv[1]);
  this.availableCommands = {};
  this.commandMaxLength = 0; //For printing help later

  // Add a dash to the end if none was provided
  if (this.prefix.substr(-1) !== '-') {
    this.prefix += '-';
  }

  // Local files in files in the /bin folder for an application
  this.localFiles = glob.sync(self.prefix+"*", {cwd: self.localDir});
  
  this.localFiles.forEach(function(file){
    // Figure out the longest command name for printing --help
    if (file.length > self.commandMaxLength) { self.commandMaxLength = file.length; }

    var commandData = require(path.join(self.localDir, file)).command;
    self.availableCommands[file.substr(self.prefix.length)] = commandData;
  });
}

util.inherits(Helmsman, events.EventEmitter);


/**
 * Simplify creating a new Helmsman Object
 *
 * Example:
 *
 *   var helmsman = require('helmsman');
 *
 *   var cli = helmsman();
 *   cli.parse();
 * 
 * @param  {Object} options   Contructor options
 * @return {Helmsman}         A new helmsman
 */

function helmsman(options){
  return new Helmsman(options);
}


/**
 * GO!
 *
 * @param {[Object]} argv   The process arguments to parse. Defaults to process.argv
 */

Helmsman.prototype.parse = function(argv){
  var self = this;

  argv = argv || process.argv; // If no arguments are passed, assume process.argv

  var args = argv.slice(2);

  // Much of the following heavily inspired or simply taken from component/bin
  // https://github.com/component/component/blob/master/bin/component
  
  // Print the command list if --help is called
  if (args[0] === '--help' || !args.length || args[0][0] === '-') {
    self.emit('--help');
    return self.showHelp();
  }

  var cmd = args.shift();

  if (!~Object.keys(self.availableCommands).indexOf(cmd)) {
    err(util.format('There is no "%s" command', cmd));
  }

  var bin = path.join(self.localDir, self.prefix + cmd);
  var subcommand = spawn(bin, args, { stdio: 'inherit' });

  subcommand.on('close', function(code){
    process.exit(code);
  });
};


/**
 * Show the help
 */

Helmsman.prototype.showHelp = function(){
  var self = this;
  
  console.log('');
  console.log('Commands:');
  console.log('');
  
  for (var command in self.availableCommands) {
    var prettyCommand = command;
    // Pad spaces at the end of each command so help descriptions line up
    for (var i = 0; i < self.commandMaxLength-command.length; i++) {
      prettyCommand+=' ';
    }
    // console.log(self.availableCommands[command]);
    console.log('   %s     %s', prettyCommand, self.availableCommands[command].description);
  }

  process.exit();
};