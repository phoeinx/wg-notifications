# wg-notifications

Send push notifications via Pushover when there are new flat share (German: WG) offers on [wg-gesucht.de](https://wg-gesucht.de/).

## Setup

* Fork this repository.
* Download [Pushover](https://pushover.net/), create an account, and [register an application](https://pushover.net/api).
* Set up the following [repository secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository): `PUSHOVER_API_TOKEN`, `PUSHOVER_USER_KEY`.
* Adjust the [configuration file](config.yml) to your needs, i.e. adjust from which date or for what type of flat you are searching.
* Rename `.github/workflows/run.yml.example` to `.github/workflows/run.yml`.
* Done! A scheduled GitHub Action executes the script every 15 minutes on weekdays. You will receive a Pushover notification whenever new offers are found.
