<?php 

echo "<pre>";

echo "\n\nwhoami\n";
echo `whoami 2>&1`;

echo "\n\ncd ..\n";
echo `cd .. 2>&1`;
echo `pwd 2>&1`;

echo "\n\ngit fetch --all\n";
echo `git fetch --all 2>&1`;

echo "\n\ngit reset --hard\n"; 
echo `git reset --hard  2>&1`; 

echo "\n\ngit pull \n";
echo `git pull 2>&1`;

echo "\n\nnpm update \n";
echo `npm update 2>&1`;

echo "\n\nHOME=\"/tmp/\" && bower update \n";
echo `HOME="/tmp/" && bower update 2>&1`;

?>
