import events from './events';
import React from 'react';
import { Meteor } from 'meteor/meteor';
import { PropTypes } from 'react';
import { render } from 'react-dom';
import './main.html';


class App extends React.Component {

  render() {
    return (<ul>{
      this.props.questions.map((question) => {
        return <li key={question.id}>{question.value}</li>;
      })
    }</ul>);
  }

}

App.propTypes = {
  questions: PropTypes.arrayOf(PropTypes.object).isRequired,
};


class AppState extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      questions: [
        { id: 1, value: 'What is 1 + 1?' },
        { id: 2, value: 'What is 2 + 2?' },
      ],
    };
  }

  componentDidMount() {
    this.subscriberId = events.subscribe(
      'update-questions', (e) => this.handleQuestionUpdate(e));
  }

  componentWillUnmount() {
    events.unsubscribe('update-questions', this.subscriberId);
  }

  render() {
    return (
      <App questions={this.state.questions} />
    );
  }
}


Meteor.startup(() => {
  render(<AppState />, document.getElementById('app'));
});
