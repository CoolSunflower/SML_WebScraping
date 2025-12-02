# Goal

Goal is to make a system to scrape websites (on which scraping is allowed) using cron jobs then look for keywords and if those keywords are found and rules are satisfied then save that to a database.
To reduce the number of scrapings we will write custom website specific code and not scrape posts hierarchialy if those have already been scraped i.e. no new post has been uploaded. For this we would need to implement website specific logic.

# High level Idea

Each post stored in the database will have the following fields:
1) Link
2) Brand: This will be applied via a set of rules
3) Subbrand: Each brand will have subbrands classified based on a bunch of rules
4) Sentiment (an enum)
5) Platform (an enum)
6) 

The rules which are used to classify brands and subbrands have the following grammar:
S -> A AND A
A -> A OR A | A NEAR/N A | "keyword" | NOT CONTAINS B
B -> ["keyword"]
For each brand and subbrand we have a rule starting with S which if satisfies that grammar belongs to that brand. We can implement this via a switch case or some other method.

The web scraping logic will in general work as follows:
1) Given website we will the contents and identify blocks 
2) We will use fixed identifiers of block and sort the current set of blocks fetched
3) Since these blocks will mostly be links to further articles we will fetch their cooresponding article/blog and search that for keyword
4) To make sure we dont waste compute for each website we will specify a different cron repetition timer
5) For each website we will need custom blocking logic based on the content fetched
6) For each website we will also store from the main index the last article processed (either in a DB or somewhere else) and we will only process new articles

Goal is to promote function reuse wherever possible.

For each website it would be preferrable to do scraping via just a GET request, but if its not possible then headless browsers may be used eg Playwright.

# NOTE: for development
we will create a testing script in which test fetching the website content with a get request and via headless browsers and save it to a file and complete the rest of the website parsing code locally with that fetched content. This will tell us the fetching and parsing logic needed for the website and we will merge everything and test it once and also write a test script (just what I thought could obviously be made better).