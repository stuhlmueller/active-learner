import { Meteor } from 'meteor/meteor';
import React from 'react';
import { render } from 'react-dom';
import './main.html';

class HelloWorld extends React.Component {
  render() {
    return (
      <p>Hello World</p>
    );
  }
}

Meteor.startup(() => {
  render(<HelloWorld />, document.getElementById('app'));
});
