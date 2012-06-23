var urlParams = {};
var username;
var trackerId = 'UA-21222559-1';

var current_callback = null;
var current_data = [];
var current_page = 1;

function jsonp(result) {
  console.log(result.data);
  current_callback(result.data);
};

function org_jsonp(result) {
  console.log(result.data);
  current_callback(result.data);
};

function repo_jsonp(result) {
  console.log(result.data);
  current_data = current_data.concat(result.data);
  if (result.data.length > 0) {
    github_user_repos(username, callback, current_page + 1, data);
  } else {
    current_callback(current_data);
  }
};

(function () {
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&=]+)=?([^&]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = window.location.search.substring(1);

    while (e = r.exec(q)) {
       urlParams[0] = d(e[1]);
    }
})();

$(document).ready(function() {
    try {
        if (urlParams[0] !== undefined) {
            username = urlParams[0];
            run();
        } else {
            home();
        }
    } catch (err) {
        try {
            console.log(err);
        } catch (e) {
            /*fail silently*/
        }
    }
});

var error = function() {
    $.ajax({
        url: 'views/error.html',
        dataType: 'html',
        success: function(data) {
            var template = data;
            $('#resume').html(data);
        }
    });
};

var home = function() {
    $.ajax({
        url: 'views/index.html',
        dataType: 'html',
        success: function(data) {
            var template = data;
            $('#resume').html(data);
        }
    });
};

var github_user = function(username, callback) {
    //$.getJSON('https://api.github.com/users/' + username, callback);
    current_callback = callback;
    $.ajax({
        url: 'https://api.github.com/users/' + username + '?callback=jsonp',
        dataType: 'jsonp',
        jsonp: 'jsonp',
        data: {
          callback: 'jsonp'
        }
    });  
}

var github_user_repos = function(username, callback, page_number, prev_data) {
    var page = (page_number ? page_number : 1),
        url = 'https://api.github.com/users/' + username + '/repos',
        data = (prev_data ? prev_data : []);

    if (page_number > 1) {
      url += '?page=' + page_number+'&callback=repo_jsonp';
    } else {
      url += '?callback=repo_jsonp';
    }
    /*$.getJSON(url, function(repos) {
        data = data.concat(repos);
        if (repos.length > 0) {
            github_user_repos(username, callback, page + 1, data);
        } else {
            callback(data);
        }
    });*/
    current_callback = callback;
    current_page = page_number;
    current_data = data;
    $.ajax({
        url: url,
        dataType: 'jsonp',
        jsonp: 'repo_jsonp',
        data: {
          callback: 'repo_jsonp'
        }
    });
}

var github_user_orgs = function(username, callback) {
    current_callback = callback;
    $.ajax({
        url: 'https://api.github.com/users/' + username + '/orgs?callback=org_jsonp',
        dataType: 'jsonp',
        jsonp: 'org_jsonp',
        data: {
          callback: 'org_jsonp'
        }
    });  
}

var run = function() {
    var itemCount = 0,
        maxItems = 5,
        maxLanguages = 9;

    var res = github_user(username, function(data) {
        var since = new Date(data.created_at);
        since = since.getFullYear();

        var addHttp = '';
        if (data.blog && data.blog.indexOf('http') < 0) {
            addHttp = 'http://';
        }

        var name = username;
        if (data.name !== null && data.name !== undefined) {
            name = data.name;
        }

        var view = {
            name: name,
            email: data.email,
            created_at: data.created_at,
            location: data.location,
            gravatar_id: data.gravatar_id,
            repos: data.public_repos,
            reposLabel: data.public_repos > 1 ? 'repositories' : 'repository',
            followers: data.followers,
            followersLabel: data.followers > 1 ? 'followers' : 'follower',
            username: username,
            since: since
        };

        if (data.blog !== undefined && data.blog !== null && data.blog !== '') {
            view.blog = addHttp + data.blog;
        }

        $.ajax({
            url: 'views/resume.html',
            dataType: 'html',
            success: function(data) {
                var template = data,
                    html = Mustache.to_html(template, view);
                $('#resume').html(html);
                document.title = name + "'s Résumé";
            }
        });
    });

    github_user_repos(username, function(data) {
        var sorted = [],
            languages = {},
            popularity;

        data.forEach(function(elm, i, arr) {
            if (arr[i].fork !== false) {
                return;
            }

            if (arr[i].language) {
                if (arr[i].language in languages) {
                    languages[arr[i].language]++;
                } else {
                    languages[arr[i].language] = 1;
                }
            }

            popularity = arr[i].watchers + arr[i].forks;
            sorted.push({position: i, popularity: popularity, info: arr[i]});
        });

        function sortByPopularity(a, b) {
            return b.popularity - a.popularity;
        };

        sorted.sort(sortByPopularity);

        var languageTotal = 0;
        function sortLanguages(languages, limit) {
            var sorted_languages = [];

            for (var lang in languages) {
                if (typeof(lang) !== "string") {
                    continue;
                }
                sorted_languages.push({
                    name: lang,
                    popularity: languages[lang],
                    toString: function() {
                        return '<a href="https://github.com/languages/' + this.name + '">' + this.name + '</a>';
                    }
                });

                languageTotal += languages[lang];
            }
            
            if (limit) {
                sorted_languages = sorted_languages.slice(0, limit);
            }
            
            return sorted_languages.sort(sortByPopularity);
        }

        $.ajax({
            url: 'views/job.html',
            dataType: 'html',
            success: function(response) {
                languages = sortLanguages(languages, maxLanguages);
                
                if (languages && languages.length > 0) {
                    var ul = $('<ul class="talent"></ul>'),
                        percent, li;
                    
                    languages.forEach(function(elm, i, arr) {
                        x = i + 1;
                        percent = parseInt((arr[i].popularity / languageTotal) * 100);
                        li = $('<li>' + arr[i].toString() + ' ('+percent+'%)</li>');
                        
                        if (x % 3 == 0 || (languages.length < 3 && i == languages.length - 1)) {
                            li.attr('class', 'last');
                            ul.append(li);
                            $('#content-languages').append(ul);
                            ul = $('<ul class="talent"></ul>');
                        } else {
                            ul.append(li);
                            $('#content-languages').append(ul);
                        }
                    });
                } else {
                    $('#mylanguages').hide();
                }

                if (sorted.length > 0) {
                    $('#jobs').html('');
                    itemCount = 0;
                    var since, until, date, view, template, html;
                    
                    sorted.forEach(function(elm, index, arr) {
                        if (itemCount >= maxItems) {
                            return;
                        }

                        since = new Date(arr[index].info.created_at);
                        since = since.getFullYear();
                        until = new Date(arr[index].info.pushed_at);
                        until = until.getFullYear();
                        if (since == until) {
                            date = since;
                        } else {
                            date = since + ' - ' + until;
                        }

                        view = {
                            name: arr[index].info.name,
                            date: date,
                            language: arr[index].info.language,
                            description: arr[index].info.description,
                            username: username,
                            watchers: arr[index].info.watchers,
                            forks: arr[index].info.forks,
                            watchersLabel: arr[index].info.watchers > 1 ? 'watchers' : 'watcher',
                            forksLabel: arr[index].info.forks > 1 ? 'forks' : 'fork',
                        };

                        if (itemCount == sorted.length - 1 || itemCount == maxItems - 1) {
                            view.last = 'last';
                        }

                        template = response;
                        html = Mustache.to_html(template, view);

                        $('#jobs').append($(html));
                        ++itemCount;
                    });
                } else {
                    $('#jobs').html('').append('<p class="enlarge">I do not have any public repositories. Sorry.</p>');
                }
            }
        });
    });

    github_user_orgs(username, function(data) {
        var sorted = [];

        data.forEach(function(elm, i, arr) {
            if (arr[i].login === undefined) {
                return;
            }
            sorted.push({position: i, info: arr[i]});
        });

        $.ajax({
            url: 'views/org.html',
            dataType: 'html',
            success: function(response) {
                var now = new Date().getFullYear();

                if (sorted.length > 0) {
                    $('#orgs').html('');
                    
                    var name, view, template, html;
                    
                    sorted.forEach(function(elm, index, arr) {
                        if (itemCount >= maxItems) {
                            return;
                        }
                        name = (arr[index].info.name || arr[index].info.login);
                        view = {
                            name: name,
                            now: now
                        };

                        if (itemCount == sorted.length - 1 || itemCount == maxItems) {
                            view.last = 'last';
                        }
                        template = response;
                        html = Mustache.to_html(template, view);

                        $('#orgs').append($(html));
                        ++itemCount;
                    });
                } else {
                    $('#organizations').remove();
                }
            }
        });
    });

};

if (trackerId) {
  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', trackerId]);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();
}

$(window).bind('error', error);
