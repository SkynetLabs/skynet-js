# Contributing

Want to contribute? Great! There are many ways to give back to the project, whether it be writing new code, fixing bugs, or just reporting errors. All forms of contribution are encouraged!

## Reporting issues

Notice something amiss? Have an idea for a new feature? Feel free to to write an [Issue](https://docs.github.com/en/free-pro-team@latest/github/managing-your-work-on-github/about-issues) on the GitHub repository about anything that you feel could be fixed or improved. Examples include:

- Unclear documentation
- Bugs, crashes
- Enhancement ideas
- ... and more

Please try to be as descriptive as possible. Provide as much information as you are able to (e.g. browser version, operating system, project version). If you are seeing an error, paste as much of the log as you can.

Of course, after submitting an Issue you are free to tackle the problem yourself (see "Submitting changes" below), and encouraged to do so.

## Choosing an Issue

If you want to contribute code but don't know what to work on, we try to always keep some Issues marked `help-wanted` or `good-first-issue`. We want everyone to be able to contribute!

## Development

We follow the common development process in the company. We use [git](https://git-scm.com/) as our [version control system](https://en.wikipedia.org/wiki/Version_control) (VCS). We develop new features in separate git branches, raise [Pull Requests](https://help.github.com/en/articles/about-pull-requests), put them under peer review, and we merge them only after they pass the QA checks and [continuous integration](https://en.wikipedia.org/wiki/Continuous_integration) (CI). We never commit directly to the `master` branch.

For useful resources, please see:

- [Git basics](https://git-scm.com/book/en/v1/Getting-Started-Git-Basics) for Git beginners
- [Git best practices](https://sethrobertson.github.io/GitBestPractices/)

## Submitting changes (Pull Requests)

If you are a complete newbie, click [here](https://github.com/firstcontributions/first-contributions) for an easy-to-follow guide (with pictures!)

We follow the standard procedure for submitting Pull Requests. Please refer to the [official GitHub documentation](https://help.github.com/articles/creating-a-pull-request/) if you are unfamiliar with the procedure. If you still need help, we are more than happy to guide you along!

**Note:** Before submitting code, please either choose an existing Issue, or write your own, describing the problem you are solving. We would like for every PR to have an accompanying Issue, so that we know concretely what the problem is and can track its resolution.

### Code Style

We try to follow standard best practices for every language and framework we use. These best practices are enforced by CI (see below) and code review (also see below).

### Format

We don't have any hard-and-fast rules for styling git commits or branch names, but try to look at existing PRs first to get a sense of how they are structured.

### Running tests (CI script)

Submitted PRs are expected to pass continuous integration (CI), which, among other things, runs a test suite on your PR to make sure that your code doesn't have any bugs.

Please refer to the README of this repo for instructions on running the CI and test suites locally.

We require that every piece of code is _covered_, meaning tested. If you aren't familiar with writing tests for the language, make your PR anyway and we'll help you from there.

### Code review

Your PR will be assigned to a team member and reviewed promptly. More often than not, a code submission will be met with review comments and changes requested. Keep in mind that it's nothing personal -- we leave each other review comments all the time.

After addressing review comments, it is up to your discretion whether you make a new commit or amend the previous one and do a [force-push](https://estl.tech/a-gentler-force-push-on-git-force-with-lease-fb15701218df) to the PR branch. We encourage amending the last commit if there are only minor changes to be made. GitHub now shows diffs for force-pushed commits, making them easy to review, and it keeps the final commit history clean.

### Deployment

Your changes will go live with the next version/release, whenever that happens, and the change will be mentioned in the changelog.
