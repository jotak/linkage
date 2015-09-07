/*
The MIT License (MIT)
Copyright (c) 2014 Joel Takvorian, https://github.com/jotak/mipod
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import q = require("q");
import fs = require('fs');
import crypto = require('crypto');
import Profile = require('./profile');

"use strict";

class Profiles {

    private static path(username: string): string {
        return "profiles/" + username + ".json";
    }

    static load(username: string): q.Promise<Profile> {
        console.log("loading: " + username);
        var deferred: q.Deferred<Profile> = q.defer<Profile>();
        fs.readFile(Profiles.path(username), {encoding: "utf8"}, function(err, data) {
            if (err) {
                deferred.reject(err);
            } else {
                var profile: Profile = eval('(' + data + ')');
                deferred.resolve(profile);
            }
        });
        return deferred.promise;
    }

    static create(username: string, password: string): q.Promise<string> {
        console.log("creating: " + username);
        var deferred: q.Deferred<string> = q.defer<string>();
        fs.readFile(Profiles.path(username), {encoding: "utf8"}, function(err, data) {
            if (err) {
                if (err.code == "ENOENT") {
                    Profiles.hash(password).then(function(hash: string) {
                        var profile: Profile = Profiles.generateEmptyProfile(username, hash);
                        fs.writeFile(Profiles.path(profile.username), JSON.stringify(Profiles.copyProfile(profile)), function(err) {
                            if (err) {
                                deferred.reject(new Error(err.code));
                            } else {
                                deferred.resolve("");
                            }
                        });
                    }).fail(function(err) {
                        deferred.reject(err);
                    }).done();
                } else {
                    deferred.reject(err);
                }
            } else {
                deferred.reject(new Error("Profile " + username + " already exists"));
            }
        });
        return deferred.promise;
    }

    static update(profile: Profile): q.Promise<string> {
        console.log("updating: " + profile.username);
        var deferred: q.Deferred<string> = q.defer<string>();
        Profiles.load(profile.username).then(function(old: Profile) {
            profile.password = old.password;
            fs.writeFile(Profiles.path(profile.username), JSON.stringify(Profiles.copyProfile(profile)), function(err) {
                if (err) {
                    deferred.reject(new Error(err.code));
                } else {
                    deferred.resolve("OK");
                }
            });
        }).fail(function(err) {
            deferred.reject(err);
        }).done();
        return deferred.promise;
    }

    static matchPassword(username: string, password: string): q.Promise<string> {
        console.log("matching password: " + username);
        var deferred: q.Deferred<string> = q.defer<string>();
        // Match password
        Profiles.hash(password).then(function(hash: string) {
            Profiles.load(username).then(function(old: Profile) {
                if (!old.password) {
                    deferred.resolve("");
                } else {
                    if (hash == old.password) {
                        deferred.resolve("");
                    } else {
                        deferred.reject(new Error("Authentication failure."));
                    }
                }
            }).fail(function(err) {
                deferred.reject(err);
            }).done();
        }).fail(function(err) {
            deferred.reject(new Error("Could not get salt. Persistence disabled."));
        }).done();
        return deferred.promise;
    }

    static generateEmptyProfile(username: string, password: string): Profile {
        return {
            username: username,
            password: password,
            page: {
                mainBlock: {
                    posx: 0,
                    posy: 0
                },
                blocks: []
            }
        }
    }

    private static copyProfile(profile: Profile): Profile {
        // Eliminate any unnecessary field
        return {
            username: profile.username,
            password: profile.password,
            page: Profiles.copyPage(profile.page)
        };
    }

    private static copyPage(page: Page): Page {
        // Eliminate any unnecessary field
        return {
            mainBlock: Profiles.copyBlock(page.mainBlock),
            blocks: page.blocks.map(function(block: CustomBlock) {
                return Profiles.copyCustomBlock(block);
            })
        };
    }

    private static copyBlock(block: Block): Block {
        // Eliminate any unnecessary field
        return {
            posx: block.posx,
            posy: block.posy
        };
    }

    private static copyCustomBlock(block: CustomBlock): CustomBlock {
        // Eliminate any unnecessary field
        return {
            posx: block.posx,
            posy: block.posy,
            title: block.title,
            links: block.links.map(function(link: Link) {
                return Profiles.copyLink(link);
            })
        };
    }

    private static copyLink(link: Link): Link {
        // Eliminate any unnecessary field
        return {
            title: link.title,
            url: link.url,
            description: link.description
        };
    }

    private static hash(password: string): q.Promise<string> {
        var deferred: q.Deferred<string> = q.defer<string>();
        fs.readFile("salt", {encoding: "utf8"}, function(err, data) {
            if (err) {
                deferred.reject(err);
            } else {
                var hash: string = crypto.createHash('sha256')
                    .update(password)
                    .digest("hex");
                deferred.resolve(hash);
            }
        });
        return deferred.promise;
    }
}
export = Profiles
