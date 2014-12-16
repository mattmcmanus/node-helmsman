'use strict';

var test = require('tap').test;

var helmsman = require('..');

var cli = helmsman({
  prefix: 'testcommand',
  localDir: './bin',
  metadata: {
    subcommandNoMetadata: {
      description: 'description from metadata',
      arguments: 'arguments from metadata'
    }
  }
});

test('construct an instance of a helmsman', function (t) {
  t.plan(7);

  t.equal(cli.localDir.substr(-8), 'test/bin', 'The localDir is set');
  t.equal(cli.prefix, 'testcommand-', 'The prefix is properly set');
  t.equal(cli.availableCommands.subcommand.description, 'A test',
          'A subcommand\'s meta data is loaded');
  t.equal(cli.availableCommands.subcommandWithExtension.description, 'A test',
          'A subcommand\'s meta data is loaded');
  t.equal(cli.availableCommands.subcommandInPython.description, '',
          'A non-JavaScript command doesn\'t have a description');
  t.equal(cli.availableCommands.subcommandNoMetadata.description,
          'description from metadata',
          'A command with metadata specified honors the description metadata');
  t.equal(cli.availableCommands.subcommandNoMetadata.arguments,
          'arguments from metadata',
          'A command with metadata specified honors the arguments metadata');
});

test('Guess the right command', function (t) {
  t.plan(5);

  var availableCommands = ['status', 'install', 'info'];

  t.equal(cli.getCommand('status', availableCommands), 'status',
          '"status" returned status');
  t.equal(cli.getCommand('st', availableCommands), 'status',
          '"st" returned status');
  t.equal(cli.getCommand('isntall', availableCommands), 'install',
          '"isntall" returned install');
  t.similar(cli.getCommand('in', availableCommands),
            {message: 'There are 2 options for "in": install, info'});
  t.similar(cli.getCommand('delete', availableCommands),
            {message: 'There are no commands by the name of "delete"'});
});
