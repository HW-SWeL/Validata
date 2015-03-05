<?php 

echo `git fetch --all 2>&1`; 
echo `git reset --hard  2>&1`; 
echo `git pull 2>&1`;

echo `npm update 2>&1`;
echo `bower update 2>&1`;

?>
