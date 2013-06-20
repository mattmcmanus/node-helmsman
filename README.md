# node-helmsman

Easily make command line interfaces using git style subcommands executables

## So what does helmsman actually do?

A common setup for command line applications is `<command> <subcommand> <arguments/options>` (for example: `git commit -m 'message'`). Rather than having a giant file that `switch`es or `if else`s over each potential subcommand, it's much neater to store each subcommand in it's own file (`bin/command`,`bin/command-subcomand`, `bin/command-subcommand2`, etc). Doing this however introduces some annoying manual steps which `helmsman` hopes to solve.

It makes it very easy to add, modify or delete subcommands without having to do housekeeping steps in your root command file or `package.json`

* `helmsman` is automatically aware of all the `<command>-<subcommand>` files in your modules `bin/` (or any folder you tell it to look at)
* Running `<command> --help` automatically generates help output, telling you all the subcommands that are available to you
* Running `<command> <subcommand>` automatically runs the `<command>-<subcommand>` file, passing along all the arguments & options
   * You can even add to or modify them before it's sent to the subcommand
* Like [optimist](https://github.com/substack/node-optimist)? Prefer [commander](https://github.com/visionmedia/commander.js)? Prefer to do all that yourself? I DON'T GIVE A DAMN and either does `helmsman`. It simply executes the files and passes along the options
* Your subcommands don't even need to know about `helmsmen`. All you need to do is add `exports.command ={}` to provide a description of the command to `helmsman`

## Installation & Setup

In your command line application folder:

```
npm install helmsman --save
```

### Setting up your main executable: `<command>`

In your main executable, add `helmsman`:

```javascript
#!/usr/bin/env node

var helmsman = require('helmsman');

helmsman().parse();
```

Want to add custom help before the generated help?

```javascript
#!/usr/bin/env node

var helmsman = require('helmsman');

var cli = helmsman()

cli.on('--help', function(){
  console.log('EXTRA HELPFUL!');
});

cli.parse();
```

### Setting up your sub-commands: `<command>-<subcommand>`

For your sub-executables to work with `helmsman` you need to do two things: 1. Expose metadata about the task, like its description and 2. Make sure the meat & potatoes of the script only runs when it's directly called

```javascript
#!/usr/bin/env node

// 1. To expose the metadata simply `exports.command`
exports.command = {
  description: 'Show current worker counts and their pids'
};

// 2. Then make sure it only runs when it's directly called:
if (require.main === module) {
  // Parse options and run the magic
}
```

## API

### helmsman([options]) or new Helmsman([options])

* `options` {Object}

Create an instance of `helmsman`. It is an `EventEmitter` and will also begin searching for files once it's instantiated. 

#### Events

* `--help`: Emitted when `--help` is passed as the first option or no commands or options are passed

#### Options

* `localDir`: The local module folder where to search for executable files. Defaults to the directory of the executable (eg: If you execute `<module folder>/bin/<command>` the `localDir` will be `<module folder>/bin`)
* `prefix`: The prefix of the subcommands to search for. Defaults to the executed file (eg: If you run `<command>` it will search for files in the `localDir` that start with `<command>-`

#### Methods

* `parse([argv])` Parse `argv` or `process.argv` if there is no argv and either display the help or run the subcommand

## TODO

* [Allow for automatically including npm installed libraries](https://github.com/mattmcmanus/node-helmsman/issues/2)

## Thanks

Much of this was inspired by TJ Holowaychuk [commander](https://github.com/visionmedia/commander.js) and [component](https://github.com/component/component)
