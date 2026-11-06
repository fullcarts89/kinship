#!/bin/zsh
# Re-captures every still in screens/ (review fallback only). Run the static server first: python3 -m http.server 8093 --directory docs/product/explorations
cd "$(dirname "$0")"; mkdir -p screens
cap() { ./capture.sh "screens/$1.png" "$2" $3 $4 $5 & }
for t in garden bloom keepsake orbit postmark woven; do
  cap "$t-today-moment" "theme=$t&state=moment"; cap "$t-person-priya" "theme=$t&screen=person&person=priya"; cap "$t-people-110" "theme=$t&screen=people&people=large"
  cap "$t-today-quiet" "theme=$t&state=quiet"; cap "$t-today-sensitive" "theme=$t&state=sensitive"; cap "$t-today-birthday" "theme=$t&state=birthday"
  wait
  cap "$t-first-tell" "theme=$t&screen=setup"; cap "$t-today-return" "theme=$t&state=return"; cap "$t-today-night" "theme=$t&state=moment&appearance=night"
  cap "$t-person-night" "theme=$t&screen=person&person=priya&appearance=night"; cap "$t-gallery" "theme=$t" 1500 1700 gallery.html
  wait
done
for t in garden bloom woven; do
  cap "$t-today-first-use" "theme=$t&state=first"; cap "$t-today-milestone" "theme=$t&state=milestone"; cap "$t-today-promise" "theme=$t&state=promise"; cap "$t-today-return-resolved" "theme=$t&state=return&phase=resolved"
  cap "$t-today-large-text" "theme=$t&state=moment&large=1"; cap "$t-today-se" "theme=$t&state=moment&se=1" 375 667
  wait
  cap "$t-people-15" "theme=$t&screen=people&people=small"; cap "$t-people-search" "theme=$t&screen=people&people=large&query=sa"; cap "$t-person-lena" "theme=$t&screen=person&person=lena"; cap "$t-person-chris" "theme=$t&screen=person&person=chris"
  cap "$t-person-mom" "theme=$t&screen=person&person=mom"; cap "$t-person-nana" "theme=$t&screen=person&person=nana"; cap "$t-person-sam" "theme=$t&screen=person&person=sam-diaz"; cap "$t-person-large-text" "theme=$t&screen=person&person=priya&large=1"
  wait
  cap "$t-sheet-detail" "theme=$t&state=moment&sheet=detail"; cap "$t-sheet-handoff" "theme=$t&state=moment&sheet=handoff"; cap "$t-sheet-correction" "theme=$t&screen=person&person=priya&sheet=correct"; cap "$t-sheet-clarify" "theme=$t&state=moment&sheet=clarify"
  cap "$t-sheet-processing" "theme=$t&state=first&sheet=processing"; cap "$t-sheet-kept-pending" "theme=$t&state=first&sheet=kept"; cap "$t-sheet-ask" "theme=$t&screen=person&person=priya&sheet=ask"; cap "$t-sheet-idea" "theme=$t&screen=person&person=priya&sheet=idea"
  wait
  cap "$t-motion-played" "theme=$t&play=1" 2500 760 motion.html; cap "$t-motion-reduced" "theme=$t&play=1&reduce=1" 2500 760 motion.html
  wait
done
cap "woven-serif-today-moment" "theme=woven&state=moment&voice=serif"; cap "woven-serif-person-priya" "theme=woven&screen=person&person=priya&voice=serif"; cap "compare-finalists-moment" "compare=finalists&state=moment" 1300 900; cap "compare-finalists-sensitive" "compare=finalists&state=sensitive" 1300 900; cap "compare-all-quiet" "compare=all&state=quiet" 2600 900
wait
ls screens | wc -l; ls -la screens | awk '$5<20000 && $9 ~ /png/ {print "SMALL", $9}'
