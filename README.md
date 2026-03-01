# Partial Diff

This is a fork of the [Partial Diff VSCode extension by ryu1kn](https://github.com/ryu1kn/vscode-partial-diff). It has the following changes:

* No telemetry
* Renamed commands to follow VS Code convention, e.g. "Select for Compare" and "Compare with Selected".
* Added "Compare Open Editors" command.
* Added option to edit the diffs.
* Added sample text normalization rules.

## Features

* You can compare (diff) text selections within a file, across different files, or from a selection to the clipboard.
* You can add user defined text-normalization rules to reduce the noise in the diff (e.g. replace tab characters to spaces), and these rules can be toggled on/off.
* Compare text in 2 visible or open editors (i.e. tabs) with one action.

![Compare two text selections](https://raw.githubusercontent.com/gbodeen/vscode-partial-diff/master/images/public.gif "old image; the commands have changed names!")

## Request Features or Report Bugs

Feature requests and bug reports are very welcome: https://github.com/gbodeen/vscode-partial-diff/issues

The original repo also states they are welcome, but it has been inactive for some time.

A couple of requests from me when you raise an github issue.

* **Requesting a feature:** Please try to provide the context of why you want that feature. Such as, in what situation the feature could help you and how, or how the lack of the feature is causing an inconvenience to you.
* **Reporting a bug:** Please include environment information (OS name/version, the editor version). Also screenshots (or even videos) are often very very helpful!

## Commands

* `Select for Compare` (**Command ID:** `extension.partialDiff.selectForCompare`)

    Select text, then use this command to mark it for comparison with the next selection.

* `Compare with Selected` (**Command ID:** `extension.partialDiff.compareWithSelected`)

    Select text, then use this command to compare it against the previous selection from the `Select for Compare` command.

* `Compare with Clipboard` (**Command ID:** `extension.partialDiff.compareWithClipboard`)

		Select text, then use this command to compare it against the previous selection from the `Select for Compare` command.

* `Compare Visible Editors` (**Command ID:** `extension.partialDiff.compareVisibleEditors`)

		If exactly two editors are visible (e.g. with a split view), compare the selected text in each. If no text is selected, it will use the full text of the editor.

* `Compare Open Editors` (**Command ID:** `extension.partialDiff.compareOpenEditors`)

		If exactly two editors are open (e.g. one visible, one in the background), compare the selected text in each. If no text is selected, it will use the full text of the editor.

* `Change Diff Normalization` (**Command ID:** `extension.partialDiff.changeDiffNormalization`)

    Toggle your normalization rules on or off. These rules can be configured in your settings.

## Configurations

* `partialDiff.commandsOnContextMenu`

    Choose which commands appear in the context menu. By default, all are visible.

* `partialDiff.preComparisonTextNormalizationRules`

    Rules to normalize texts for diff view.

    The rules don't mutate texts in the editors. Only texts in diff views get normalized.
    If a diff is presented with text normalized, `~` is used in the diff title instead of `↔`)
    When normalization rules are active, editable diff mode is disabled and comparison falls back to read-only diff.

    Each rule has `match`, `replaceWith`. `name` or `enableOnStart` are optional.

    * `name`: Optional. Name of the rule to describe what the rule is for. You see this name on normalization rule toggle menu.
    * `match`: Regular expression to find text you want to normalise. [Global search flag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions?redirectlocale=en-US&redirectslug=JavaScript%2FGuide%2FRegular_Expressions#Advanced_searching_with_flags) is automatically applied.
    * `replaceWith`: One of the following
      * **Replacement text** as a string. You can use `$N`, where `N` is the index of substring (starting from 1) you captured in `match` with `()`.
      * **Letter case specification** as an object. Valid cases are `upper` and `lower`.
    * `enableOnStart`: Optional. Set it `false` if you don't want to use the rule when the extension starts up.

    Sample `preComparisonTextNormalizationRules`:

    ```
    "partialDiff.preComparisonTextNormalizationRules": [
      {
        "name": "Replace tabs with whitespaces",
        "match": "\t",
        "replaceWith": "  "
      },
      {
        "name": "One space after comma",
        "match": ", *([^,\n]+)",
        "replaceWith": ", $1"
      },
      {
        "name": "Capitalize",
        "match": ".*",
        "replaceWith": {"letterCase": "upper"},
        "enableOnStart": false
      }
      ...
    ]
    ```

* `partialDiff.enableEditableDiffs`

	Enable to make the diffs editable. Edits will be applied to the source files when possible. When not possible (e.g. for the clipboard, or after normalization rules have been applied), the affected part of the diff will be read-only.

## Keyboard Shortcuts

You can quickly mark the selected text by adding the `partial-diff` commands to your keyboard shortcut settings. For example:

```json
  { "key": "ctrl+1", "command": "extension.partialDiff.selectForCompare",
                        "when": "editorTextFocus" },
  { "key": "ctrl+2", "command": "extension.partialDiff.compareWithSelected",
                        "when": "editorTextFocus" },
```

## Known problems

* If you want to compare text in Output channels, you'll need to execute the commands via keyboard shortcuts or the context menu (i.e. right-click menu). Executing the commands through the command palette doesn't work. See [Cannot compare texts in Outputs channel if the mark text commands are executed from the command palette](https://github.com/ryu1kn/vscode-partial-diff/issues/3).

## Changelog

* https://github.com/gbodeen/vscode-partial-diff/blob/master/CHANGELOG.md

## How to Contribute

1. Clone this repository
1. Make code changes
1. Before you make a pull request, you can run linter and tests to avoid build failure

    ```sh
    $ npm run prep
    ```
