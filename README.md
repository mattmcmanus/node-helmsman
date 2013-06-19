# node-helmsman

Easily make command line interfaces using git style subcommands

Say your `bin/` folder includes the following files:

* `git`
* `git-status`
* `git-commit`
* `git-revert`
* ...

Wouldn't it be nice if:

* Running `git --help` automatically generated help output, telling you all the subcommands that are available to you?
* Running `git status` automatically runs the `git-status` file, passing all the arguments & options?
* The subcommand (`git-status`) could use whatever option parsing library you wanted (commander or optimist)?

Super! Helmsman is here to help!

## Installation & Setup

In your command line application folder:

```
npm install helmsman --save
```

### Setting up your main executable

In your main executable (eq: `git`), add `helmsman`:

```javascript
var helmsman = require('helmsman');

helmsman().parse();
```

Want to add custom help before the generated help?

```javascript
var helmsman = require('helmsman');

var cli = helmsman()

cli.on('--help', function(){
  console.log('EXTRA HELPFUL!');
});

cli.parse();
```

### Setting up your sub-commands

For your sub-executables to work with `helmsman` you need to do two things: 1. Expose metadata about the task, like its description and 2. Make sure the meat & pototoes of the script only runs when it's directly called

To expose the metadata simply `exports.command`

```javascript
exports.command = {
  description: 'Show current worker counts and their pids'
};
```

Then make sure it only runs when it's directly called:

```javascript
if (require.main === module) {
  // Parse options and run the magic
}
```

## API

...

## TODO

* [Allow for automatically including npm installed libraries](https://github.com/mattmcmanus/node-helmsman/issues/2)