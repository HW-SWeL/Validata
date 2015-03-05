<?php 

echo "<pre>";

echo "\n\nwhoami\n";
echo `whoami 2>&1`;

echo "\n\nHOME="/tmp/" \n";
echo `HOME="/tmp/" 2>&1`;

echo "\n\ncd ..\n";
echo `cd .. 2>&1`;

echo "\n\ngit fetch --all\n";
echo `git fetch --all 2>&1`;

echo "\n\ngit reset --hard\n"; 
echo `git reset --hard  2>&1`; 

echo "\n\ngit pull \n";
echo `git pull 2>&1`;

echo "\n\nnpm update \n";
echo `npm update 2>&1`;

echo "\n\nbower update \n";
echo `bower update 2>&1`;

?>
