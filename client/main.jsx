import events from './events';
import React from 'react';
import { Meteor } from 'meteor/meteor';
import { PropTypes } from 'react';
import { render } from 'react-dom';
import './main.html';




// webppl.run("flip(.5)", function(s, x){console.log(x)})

function renderAnswer(value) {
  return value ? 'Yes.' : 'No.';
}


class History extends React.Component {

  render() {
    return (
      <ul id="history">{
        this.props.entries.map((obj) => {
          return (
            <li key={obj.id}>
              <span className="questionText">{obj.questionText}</span> {' '}
              <span className="answerText">{renderAnswer(obj.answerValue)}</span>
            </li>);
        })}
      </ul>);
  }

}

History.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.object).isRequired,
};


class Upcoming extends React.Component {

  render() {
    return (
      <ul id="upcoming">{
        this.props.entries.map((obj) => {
          return <li key={obj.id}>{obj.questionText} (score {obj.score})</li>;
        })}
      </ul>);
  }

}

Upcoming.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.object).isRequired,
};


class Question extends React.Component {

  handleAnswer(e, value) {
    this.props.processAnswer(value);
  }

  render() {
    return (
      <div id="question">
        <div key={this.props.id} id="questionText">
          {this.props.text}
        </div>
        <div id="answerInputs">
          <input type="button" value="yes" onClick={(e)=>{this.handleAnswer(e, true)}} />
          <input type="button" value="no" onClick={(e)=>{this.handleAnswer(e, false)}} />
        </div>
      </div>);
  }

}

Question.propTypes = {
  id: PropTypes.number.isRequired,
  processAnswer: PropTypes.func.isRequired,
  text: PropTypes.string.isRequired,
};


class OutOfQuestions extends React.Component {

  render() {
    return <p>I'm out of questions.</p>;
  }

}


class App extends React.Component {

  render() {
    const current = this.props.current;
    return (
      <div>
        <p id="prompt">Think of a number between 1 and 100. I'll try to guess it.</p>
        <History entries={this.props.history} />
        { current ?
          <Question id={current.id}
                    processAnswer={this.props.processAnswer}
                    text={current.questionText} /> :
          <OutOfQuestions /> }
        <Upcoming entries={this.props.upcoming} />
      </div>);
  }

}

App.propTypes = {
  history: PropTypes.arrayOf(PropTypes.object).isRequired,
  current: PropTypes.object,
  processAnswer: PropTypes.func.isRequired,
  upcoming: PropTypes.arrayOf(PropTypes.object).isRequired,
};


class AppState extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      history: [],
      current: { id: 1, questionText: 'Is it even?', answerValue: true, score: 8 },
      upcoming: [
        { id: 2, questionText: 'Is it greater than 30?', answerValue: false, score: 6 },
        { id: 3, questionText: 'Is it a prime?', score: 5 },
        { id: 4, questionText: 'Is it 4?', score: 3 },
      ],
    };
  }

  componentDidMount() {
    this.subscriberId = events.subscribe(
      'update-question-scores', (e) => this.handleStateUpdate(e));
  }

  componentWillUnmount() {
    events.unsubscribe('update-question-scores', this.subscriberId);
  }

  processAnswer(answerValue) {
    const { history, current, upcoming } = this.state;
    const newState = {
      history: history.concat([{
        id: current.id,
        questionText: current.questionText,
        score: current.score,
        answerValue,
      }]),
      current: upcoming[0],
      upcoming: upcoming.slice(1)
    };
    this.setState(newState);
  }

  render() {
    return (
      <App current={this.state.current}
           history={this.state.history}
           processAnswer={this.processAnswer.bind(this)}
           upcoming={this.state.upcoming} />
    );
  }
}


Meteor.startup(() => {
  render(<AppState />, document.getElementById('app'));
});
