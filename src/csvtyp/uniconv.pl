#!/usr/bin/perl
# read from stdin and convert Unicode escape sequences

use strict;
use warnings;

binmode(STDOUT, ':utf8');

while (<>) {
  s/\\u([0-9a-fA-F]{4})/chr(hex($1))/eg;
  # check for chars not in latin-1
  next if (/[\x{024F}-\x{FFFF}]/);
  print; 
}
