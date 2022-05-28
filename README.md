# parse-anime-torrent-name

parse anime torrent name into JSON

### to use as a library

example :

```
#!/usr/bin/env node

const parse = require("./parse-anime-torrent-name");

const parsed_info = parse("[ExampleGroup] Example Title - 01 (BD 1920x1080 x.264 Flac).mkv");
console.log(parsed_info);
```

output :

```
{
  codec: [ 'x.264', 'Flac' ],
  resolution: [ '1920x1080' ],
  rip: [ 'BD' ],
  tags: [
    'BD',         '1920x1080',
    'x.264',      'Flac',
    'Example',    'Title',  
    '01'
  ],
  orig_name: '[ExampleGroup] Example Title - 01 (BD 1920x1080 x.264 Flac).mkv',
  ext: '.mkv',
  title: 'Example Title',
  season: NaN,
  episode: 1,
  pirate_group: 'ExampleGroup'
}
```


### to use as a command-line tool

usage : 

```
node . [TORRENT_NAME] [TORRENT_NAME] ...
```

example :

```
❯❯ node . '[ExampleGroup] Example Title - 01 (BD 1920x1080 x.264 Flac).mkv"' | jq
[
  {
    "codec": [
      "x.264",
      "Flac"
    ],
    "resolution": [
      "1920x1080"
    ],
    "rip": [
      "BD"
    ],
    "tags": [
      "BD",
      "1920x1080",
      "x.264",
      "Flac",
      "Example",
      "Title",
      "01"
    ],
    "orig_name": "[ExampleGroup] Example Title - 01 (BD 1920x1080 x.264 Flac).mkv\"",
    "ext": ".mkv\"",
    "title": "Example Title",
    "season": null,
    "episode": 1,
    "pirate_group": "ExampleGroup"
  }
]
```
