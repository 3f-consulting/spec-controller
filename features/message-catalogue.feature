@MSG
Feature: a message catalogue gives back the text for a code

  The tool's sentences for a reader are kept in a message catalogue, a data file apart from the
  code, so mutation testing has no words to change. There is one catalogue for each package.

  To get a sentence, the program asks the catalogue for the text under a message code, and gives it any values
  to fill in. A mistake in a catalogue is a mistake made in development. It never stops a run: what
  comes back names the code and its values instead.

  Rule: a code that takes no values gives back its text unchanged

    @unit @CLM-MSG-008
    Scenario: the text for a code will be its text, unchanged
      given the catalogue had the text "No feature files were found." under the code no-features
      when the text for no-features is retrieved
      then the text will be "No feature files were found."

  Rule: a code that takes values gives back its text with each gap filled in

    @unit
    Scenario Outline: each value will fill its gap in the text
      given the catalogue had the text "<text>" under a code
      when the text for that code is retrieved with <values>
      then the text will be "<retrieved>"

      Examples:
        | clm         | text                                   | values                              | retrieved                          |
        | CLM-MSG-016 | The format {format} is not written.    | format html                         | The format html is not written.    |
        | CLM-MSG-017 | {entry} is {is} where {reads} is read. | entry unit, is 3 and reads a runner | unit is 3 where a runner is read.  |
        | CLM-MSG-018 | {format} is not {format}.              | format html                         | html is not html.                  |
        | CLM-MSG-015 | {count} steps ran.                     | count 1000                          | 1000 steps ran.                    |
        | CLM-MSG-019 | The format {format} is not written.    | format {other}                      | The format {other} is not written. |
        | CLM-MSG-020 | The format {format} is not written.    | format it's                         | The format it's is not written.    |
        | CLM-MSG-021 | The format {format} is not written.    | an empty format                     | The format  is not written.        |
        | CLM-MSG-022 | No format was written.                 | format html                         | No format was written.             |

  Rule: a mistake in a catalogue gives back the code and its values

    @unit
    Scenario Outline: a code with no usable text will give back the code
      given the catalogue had <entry> under the code no-features
      when the text for no-features is retrieved
      then the text will be "no-features"

      Examples:
        | clm         | entry                                    |
        | CLM-MSG-002 | no text                                  |
        | CLM-MSG-004 | a blank text                             |
        | CLM-MSG-007 | the text "No feature {files were found." |

    @unit
    Scenario Outline: a text the values cannot fill will give back the code and its values
      given the catalogue had <entry> under the code unknown-format
      when the text for unknown-format is retrieved with format html
      then the text will be "unknown-format (format: html)"

      Examples:
        | clm         | entry                                         |
        | CLM-MSG-023 | no text                                       |
        | CLM-MSG-005 | the text "The format {name} is not written."  |
        | CLM-MSG-024 | the text "The format {format is not written." |

    @unit @CLM-MSG-025
    Scenario: a value of null will give back the code and its values
      given the catalogue had the text "The format {format} is not written." under the code unknown-format
      when the text for unknown-format is retrieved with format null
      then the text will be "unknown-format (format: null)"
