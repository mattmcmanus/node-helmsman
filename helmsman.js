'use strict';

/*!
 * Module dependencies.
 */
var util = require('util');
var events = require('events');
var path = require('path');
var glob = require('glob');
var spawn = require('child_process').spawn;
var _ = require('lodash');
var _s = require('underscore.string');

var domain = require('domain').create();

require('colors');


/**
 * The default function used to get metadata from a command
 */
function defaultFillCommandData(defaults, file, extension) {
  var data;

  try {
    data = require(file).command || {};
  } catch (e) {
    // If it's JavaScript then return the error
    if (extension === '.js') {
      data = {failedRequire: e};
    }
  }

  return _.merge(defaults, data);
}


/**
 * The Helmsman constructor
 *
 * Options:
 *
 *   * prefix: The prefix of the script files. e.g.: 'git-''
 *
 * @param  {object} options   config
 */
function Helmsman(options) {
  var self = this;

  events.EventEmitter.call(self);

  options = options || {};

  // Add option defaults
  options = _.merge({
    usePath: false,
    metadata: {},
    fillCommandData: defaultFillCommandData,
    fallbackCommandData: true,
    ignoreRequireFail: true,
    nodePath: 'node'
  }, options);

  this.fillCommandData = options.fillCommandData;
  this.fallbackCommandData = options.fallbackCommandData;
  this.ignoreRequireFail = options.ignoreRequireFail;

  this.nodePath = options.nodePath;

  if (!options.localDir) {
    this.localDir = path.dirname(module.parent.filename);
  } else {
    this.localDir = path.resolve(options.localDir);
  }

  // Guess the prefix. Assume if one isn't given and that executable doesn't
  // equal the root command filename, use the filename of the root command
  if (!options.prefix &&
      path.basename(process.argv[1]) !== path.basename(require.main.filename)) {
    this.prefix = path.basename(require.main.filename,
      path.extname(require.main.filename));
  } else {
    this.prefix = options.prefix || path.basename(process.argv[1],
      path.extname(process.argv[1]));
  }

  this.availableCommands = {};

  // Add a dash to the end if none was provided
  if (this.prefix.substr(-1) !== '-') {
    this.prefix += '-';
  }

  // Local files in files in the /bin folder for an application
  this.localFiles = glob.sync(self.prefix + '*', {cwd: self.localDir})
    .map(function (file) {
      return path.join(self.localDir, file);
    });

  if (options.usePath) {
    var pathTokens = process.env.PATH.split(':');

    pathTokens.forEach(function (pathToken) {
      self.localFiles = self.localFiles.concat(glob.sync(self.prefix + '*',
        {cwd: pathToken}).map(function (file) {
          return path.join(pathToken, file);
        }));
    });
  }

  this.localFiles.forEach(function (file) {
    var extension = path.extname(file);
    var name = path.basename(file, extension).substr(self.prefix.length);

    var defaultCommandData = {
      name: name,
      description: '',
      arguments: '',
      path: file
    };

    // We get the defaults as a minimum if there's no strategy for the
    // extension and no custom fillCommandData function specified
    var commandData = _.clone(defaultCommandData);

    // Load the command data from the metadata option if present
    if (options.metadata[name]) {
      commandData = _.merge(defaultCommandData, options.metadata[name]);
    // Only try to get metadata from commands written in JavaScript
    } else if ((extension === '' || extension === '.js') &&
               self.fillCommandData === defaultFillCommandData) {
      commandData = self.fillCommandData(defaultCommandData, file, extension);

      if (!self.ignoreRequireFail && commandData.failedRequire) {
        console.error(util.format('The file "%s" did not load correctly: %s',
          file, commandData.failedRequire).red);

        process.exit(1);
      }
    } else if (self.fillCommandData !== defaultFillCommandData) {
      commandData = self.fillCommandData(defaultCommandData, file, extension);

      if (!commandData && self.fallbackCommandData) {
        commandData = defaultFillCommandData(defaultCommandData,
                                             file, extension);
      }
    }

    self.availableCommands[name] = commandData;
  });

  // help is always available!
  self.availableCommands.help = {
    arguments: '<sub-command>',
    description: 'Show the --help for a specific command'
  };
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
function helmsman(options) {
  return new Helmsman(options);
}


/**
 * Determine the subcommand to run
 *
 *  Try:
 *    * Explicit match (status === status)
 *    * Shorthand (st === status)
 *    * Levenshtein of <=2 (sratus === status)
 *
 * @param  {String} cmd The command given to the script
 * @param  {[String]} availableCommands An array of all the available commands
 * @return {String}     The actual command that will be run
 */
Helmsman.prototype.getCommand = function (cmd, availableCommands) {
  var self = this;

  if (!availableCommands) {
    availableCommands = _.keys(self.availableCommands);
  }

  if (_.contains(availableCommands, cmd)) {
    return cmd;
  }

  // Determine how many commands match the iterator. Return one if command,
  function isOneOrMore(commands, iterator) {
    var list = commands.filter(iterator);

    if (list.length === 1) {
      return list[0];
    } else if (list.length > 1) {
      return new Error(util.format('There are %d options for "%s": %s',
        list.length, cmd, list.join(', ')));
    }

    return false;
  }

  // If there is a shorthand match, return it
  var shortHandCmd = isOneOrMore(availableCommands, function (command) {
    return (command.indexOf(cmd) === 0);
  });

  if (shortHandCmd) {
    return shortHandCmd;
  }

  // If there is a close match, return it
  var similarCmd = isOneOrMore(availableCommands, function (command) {
    return (_s.levenshtein(cmd, command) <= 2);
  });

  if (similarCmd) {
    console.log('You typed', cmd, 'which matched', similarCmd);

    return similarCmd;
  }

  // If nothing, then get outta here
  return new Error(util.format('There are no commands by the name of "%s"',
    cmd));
};


/**
 * GO!
 *
 * @param {[Object]} argv   The arguments to parse. Defaults to process.argv
 */
Helmsman.prototype.parse = function (argv) {
  var self = this;

  // Default to process.argv
  argv = argv || process.argv;

  var args = argv.slice(2);

  // Much of the following heavily inspired or simply taken from component/bin
  // https://github.com/component/component/blob/master/bin/component

  // Print the module's version number
  if (args[0] === '--version') {
    var pkg = require(path.join(path.dirname(require.main.filename), '..',
      'package.json'));

    return console.log(pkg.name + ': ' + pkg.version);
  }

  // Print the command list if --help is called
  if (args[0] === '--help' ||
      !args.length ||
      args[0][0] === '-' ||
      (args[0] === 'help' && args.length === 1) ||
      (self.getCommand(args[0]) === 'help' && args.length === 1)) {
    self.emit('--help');

    return self.showHelp();
  }

  var cmd = self.getCommand(args.shift());

  if (util.isError(cmd)) {
    console.error(cmd.message.red);
    self.showHelp();
    process.exit(1);
  }

  // Implicit help
  // If <command> help <sub-command> is entered, automatically run
  // <command>-<sub-command> --help
  if (cmd === 'help') {
    cmd = args.shift();
    args = ['--help'];
  }

  var fullPath = self.availableCommands[cmd] &&
    self.availableCommands[cmd].path;

  domain.on('error', function (err) {
    if (err.code === 'EACCES') {
      console.error();
      console.error('Could not execute the subcommand: ' + self.prefix + cmd);
      console.error();
      console.error('Consider running:\n chmod +x', fullPath);
    } else {
      console.error(err.stack.red);
    }
  });

  domain.run(function () {
    // Windows doesn't know how to execute .js files, we help it out by
    // launching it with node
    if (process.platform === 'win32' &&
        path.extname(fullPath) === '.js') {
      args.unshift(fullPath);
      fullPath = self.nodePath;
    }

    var subcommand = spawn(fullPath, args, {stdio: 'inherit'});

    subcommand.on('close', function (code) {
      process.exit(code);
    });
  });
};


/**
 * Show the help
 */
Helmsman.prototype.showHelp = function () {
  console.log();
  console.log('Commands:');
  console.log();

  var strings = _.map(this.availableCommands, function (command) {
    return command.name + ' ' + command.arguments;
  });

  var maxLength = _.max(_.pluck(strings, 'length'));

  var descriptions = _.pluck(this.availableCommands, 'description');

  _.zip(strings, descriptions).forEach(function (c) {
    console.log('   %s     %s', _s.rpad(c[0], maxLength), c[1]);
  });

  process.exit();
};


/**
 * Exports
 */
module.exports = exports = helmsman;

exports.Helmsman = Helmsman;
