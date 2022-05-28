#!/usr/bin/env node

"use strict"; 

const path = require('path');

const BRACKET_REGEX = /(\[(.*?)\]|\((.*?)\)|（(.*?)）|【(.*?)】)/g;
const tag_fields = {
    codec: [/^[Xx]\.?264$/, 'aac', /^[Hh]\.?264$/, /flac(x[0-9]+)?/i, 'x265', 'hevc', /10bits?/, /[0-9]+fps$/, 'AC3'],
    resolution: [/^[0-9]+[Xx][0-9]+$/, /^[0-9]+[Pp]$/, /720/g, /1080/g],
    rip: ['webrip', 'bdrip', 'web', 'tv', /^bd/gi, 'bdmv', 'webdl', 'dvd'],
    raw: ['raw', 'nosubs'],
    v: [/^[Vv][0-9]+$/],
    format: ['mp4', 'mkv', 'avi'],
    q: ['sd', 'hq'],
    局: ['TVK', 'TBS', 'tv tokyo', 'tva', 'abc', 'tx'], 
};

function tags2obj(tags) {
    const tags_futher_splitted = tags.map(t => t.split(/[\-_\s\|]/)).flat();

    const matches = (t, check_against) => {
        if (check_against instanceof RegExp && t.match(check_against)) {
            return true;
        }
        else if (typeof check_against === 'string' && check_against.toLowerCase() === t.toLowerCase()) {
            return true;
        }
    };

    let out_obj = {};
    const add_field = (field, entry) => {
        if (! (field in out_obj)) out_obj[field] = [];
        if (out_obj[field].indexOf(entry) === -1) {
        out_obj[field].push(entry);
        }
    };


    for (const [field, matching_list] of Object.entries(tag_fields)) {
        for (const ml of matching_list) {
            for (const t of tags_futher_splitted) {
                if (matches(t, ml)) add_field(field, t);
            }
        }
    }
    return out_obj;
}

function filename_ext(name) {
    const basename = path.basename(name.trim());
    return {
        name: path.parse(basename).name.trim(),
        ext: (path.parse(basename).ext + "").trim(),
    };
}


function extract(name) {
    const orig_name = name;
    if (! orig_name) {
        throw new Error("expecting `name` to be non-empty");
    }

    // remove first parenthesis, which is usually a group name
    let pirate_group;
    const mat1 = name.match(/^(\[(.*?)\]|\((.*?)\)|（(.*?)）|【(.*?)】)/);
    if (mat1) {
        pirate_group =mat1[5] ? mat1[5] : mat1[4] ? mat1[4] : mat1[3] ? mat1[3] : mat1[2] ? mat1[2] : null;
        name = name.substr(mat1[0].length).trim();
    }

    let title = name.replaceAll(BRACKET_REGEX, "").trim();

    // remove all "(XX)" or "[XX]" elements
    const bracket_matches = [...name.matchAll(BRACKET_REGEX)];
    const bracket_elements = bracket_matches.map(bm => bm[5] ? bm[5] : bm[4] ? bm[4] : bm[3] ? bm[3] : bm[2] ? bm[2] : null).filter(e => !!e).map(str => str.trim());
    if (! title) { title = 
        JSON.parse(JSON.stringify(
        bracket_elements.sort( (a,b) => a.length - b.length )
        )).pop();
    }
    let tags = bracket_elements.filter(str => ! str.match(/^[A-Fa-f0-9]{6,}$/)).map(str => str.split(/[ \-_\|]/g)).flat();
    const name2 = name.replace(/\[(.*?)\]|\((.*?)\)/g, '').trim();

    // file extension ?
    const path_ext = filename_ext(name2);
    const name3 = path_ext.name;
    const ext = path_ext.ext;


    // extract episode number
    let season_episode = [
        {regex: /^(.*?)[\s\-\.]+[Ss]([0-9]+)[Ee]([0-9]+)/, title: 1, season: 2, episode:3},  // xxxxx.SxxExx
        {regex: /((.*?) )[\-—] ([0-9]+)/, episode: 3, title: 2},                               // xxxxx - NN
    ].map(pattern => {
        const {regex, season, episode, title} = pattern;
        const mat = name3.match(regex);
        if (mat) {
            const season_num =  parseInt(mat[season]) ;
            const episode_num =  parseInt(mat[episode]) ;
            const title_str = title ? mat[title]: null;
            return {
                title: title_str,
                season: season_num,
                episode: episode_num,
            }
        }
        else {
            return null;
        }
    });

    season_episode=season_episode.filter(e => !! e).shift(); // shift= get first matching element

    // scrape more tags 
    if (name3.match(/[\s\.]/g)) {
        const name3_tok = name3.split(/[\s\.]/g).map(s => s.trim()).filter(s => !!s && s !== '-' && s !== '+')
        tags = tags.concat(name3_tok);
    }


    let season=  season_episode ? (season_episode.season === -1 ? null : season_episode.season) : null;
    let episode = season_episode ? (season_episode.episode === -1 ? null : season_episode.episode) : null;
    if (season_episode?.title) {
        title = season_episode.title;
    }

    if (! episode) {
        // try to extract episode from tags
        let tags_ep = tags.filter(t => (t + '').match(/^[0-9]+$/));
        if (tags_ep.length) {
            episode = parseInt(tags_ep.pop());
        }
    }

    if (! title) {
        let mat_t = name3.match(/^(.*?) [\-:\/]/);
        if (mat_t) {
            title = mat_t[1];
        }
    }

    if (! season) {
        let sea_t = name3.match(/S([0-9]+)/);
        if (sea_t) {
            season = parseInt(sea_t[1]);
        }
        else {
            for (const t of tags) {
                const t_mat = t.match(/^[Ss]([0-9]+)$/);
                if (t_mat) {
                    season = parseInt(t_mat[1]);
                    break;
                }
            }
        }
    }

    
    const ext_regexp = new RegExp(ext + '$');
    title = title.replace(ext_regexp, "").trim();

    const base = tags2obj(tags);
    return Object.assign(base, {
        tags,
        orig_name,
        ext,
        title,
        season,
        episode,
        pirate_group,
    });
}

function main() {
    const args = Array.from(process.argv);
    const me = args[1];
    args.splice(0,2)
    if (! args.length) {
        console.warn(`\nusage : node ${path.basename(me)} [TORRENT_NAME] ...\n`);
        return process.exit(1);
    }
    console.log(JSON.stringify( args.map(extract)));

}

if (require.main === module) {
    main();
}

module.exports = extract;

