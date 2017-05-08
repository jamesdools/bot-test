'use strict';

const _ = require('lodash');
const moment = require('moment');
const episodes = require('./data');

module.exports = () => {
  const date = moment();
  const currentDay = date.format('dddd');

  const episodesToday = episodes.filter((episode) => {
    return episode.weekday === currentDay;
  });

  const closestEpisode = episodesToday.reduce((last, episode) => {
    const episodeTime = moment(episode.time_of_day, "h:mma");
    const currentTime = moment().format();
    const difference = (episodeTime.diff(currentTime, 'minutes'));

    episode.difference = (Math.abs(difference));

    return last.difference < episode.difference ? last : episode;
  });

  return closestEpisode;
};
