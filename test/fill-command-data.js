'use strict';

var test = require('tap').test;

var helmsman = require('..');

var cli = helmsman({
  localDir: './bin',
  fillCommandData: function (commandData) {
    commandData.description = 'abc123';
    commandData.arguments = 'xyz789';

    return commandData;
  }
});

test('construct an instance of a helmsman', function (t) {
  t.plan(2);

  t.equal(cli.availableCommands.subcommand.description,
          'abc123', 'A custom command data function loads data');
  t.equal(cli.availableCommands.subcommand.arguments,
          'xyz789', 'A custom command data function loads data');
});
