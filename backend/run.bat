@echo off
set MAVEN_HOME=c:\lng\.tools\apache-maven-3.9.9
set PATH=c:\lng\.tools\apache-maven-3.9.9\bin;%PATH%
cd /d c:\lng\backend
mvn.cmd spring-boot:run -DskipTests > c:\bs_log.txt 2>&1