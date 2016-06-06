import _ from 'lodash';
import React from 'react';
import { Meteor } from 'meteor/meteor';
import { PropTypes } from 'react';
import { render } from 'react-dom';
import './main.html';


function renderAnswer(value) {
  return value ? 'Yes.' : 'No.';
}

function renderQuestion(question) {
  if (question.questionData) {
    return question.questionText.replace('#1', question.questionData[0]);
  } else {
    return question;
  }
}

function questionKey(question) {
  return question.questionText + JSON.stringify(question.questionData);
}


class History extends React.Component {

  render() {
    return (
      <ul id="history">{
        this.props.entries.map((obj) => {
          return (
            <li key={questionKey(obj)}>
              <span className="questionText">{renderQuestion(obj)}</span> {' '}
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
          return <li key={questionKey(obj)}>{renderQuestion(obj)} (eig {obj.eig})</li>;
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
        <div key={questionKey(this.props.question)} id="questionText">
          {renderQuestion(this.props.question)}
        </div>
        <div id="answerInputs">
          <input type="button" value="yes" onClick={(e)=>{this.handleAnswer(e, true)}} />
          <input type="button" value="no" onClick={(e)=>{this.handleAnswer(e, false)}} />
        </div>
      </div>);
  }

}

Question.propTypes = {
  processAnswer: PropTypes.func.isRequired,
  question: PropTypes.object.isRequired,
};


class OutOfQuestions extends React.Component {

  render() {
    return <p>I'm out of questions.</p>;
  }

}


class App extends React.Component {

  renderBox() {
    const current = this.props.current;
    const infoToGain = !this.props.noInformationToGain;
    const isThinking = this.props.isThinking;
    if (!current) {
      return <OutOfQuestions />
    }
    if (!infoToGain) {
      return (
        <div id="done">
          I have learned all I could learn from you.
        </div>);
    }
    if (isThinking) {
      return <div id="thinking">Let me think...</div>;
    }
    return (
      <Question id={questionKey(current)}
                processAnswer={this.props.processAnswer}
                question={current} />);
  }

  render() {
    return (
      <div>
        <p id="prompt">Think of a number between 1 and 100. I'll try to guess it.</p>
        <History entries={this.props.history} />
        {this.renderBox()}
        <Upcoming entries={this.props.upcoming} />
      </div>);
  }

}

App.propTypes = {
  history: PropTypes.arrayOf(PropTypes.object).isRequired,
  current: PropTypes.object,
  processAnswer: PropTypes.func.isRequired,
  upcoming: PropTypes.arrayOf(PropTypes.object).isRequired,
  noInformationToGain: PropTypes.bool.isRequired,
  isThinking: PropTypes.bool.isRequired,
};


class AppState extends React.Component {

  constructor(props) {
    super(props);
    const initialQuestions = this.props.initialWebPPLResult;
    this.state = {
      history: [],
      current: initialQuestions[0],
      upcoming: initialQuestions.slice(1),
      noInformationToGain: false,
      isThinking: false
    };
  }

  processAnswer(answerValue) {
    const { history, current, upcoming } = this.state;
    const newState = {
      history: history.concat([{
        id: current.id,
        questionText: current.questionText,
        questionData: current.questionData,
        eig: current.eig,
        answerValue,
      }]),
      current: upcoming[0],
      upcoming: upcoming.slice(1)
    };
    this.setState(newState);
    if (newState.upcoming.length === 0) {
      return;
    }
    this.setState({ isThinking: true });
    setTimeout(() => {
      const options = {
        history: newState.history,
        current: newState.current,
        renderQuestion: renderQuestion
      };
      this.props.webpplFunc(options, (result) => {
        const bestQuestion = result[0];        
        this.setState({
          current: bestQuestion,
          upcoming: result.slice(1),
          isThinking: false
        });
        if (bestQuestion.eig < 1e-15) {
          this.setState({
            noInformationToGain: true
          });
        }
      });
    });
  }

  render() {
    return (
      <App current={this.state.current}
           history={this.state.history}
           processAnswer={this.processAnswer.bind(this)}
           upcoming={this.state.upcoming}
           noInformationToGain={this.state.noInformationToGain}
           isThinking={this.state.isThinking} />
    );
  }
}


class WebPPLLoader extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      statusMessage: 'Initializing...',
      webpplFunc: null
    };
  }

  componentDidMount() {
    this.loadWebPPLModel(this.statusMessage.bind(this), (webpplFunc) => {
      this.setState({ webpplFunc });
      webpplFunc({}, (result) => {
        this.setState({
          initialWebPPLResult: result,
          loaded: true
        });
      });
    });
  }

  loadWebPPLModel(statusMessage, callback) {
    statusMessage('Loading model code...');
    $.ajax({
      url: "/models/number-game.wppl",
      success: function(modelCode){
        statusMessage('Evaluating model to get webppl function...');
        webppl.run(modelCode, (s, cpsWebPPLFunc) => {
          statusMessage('Got compiled webppl function.');
          const webpplFunc = (arg, callback) => {
            var f = cpsWebPPLFunc({}, (s, result) => {
              statusMessage('Got result from running webppl function: ' +
                            JSON.stringify(result));
              callback(result);
            }, '', arg);
            while (f) {
              f = f();
            }
          };
          callback(webpplFunc);
        });
      }
    });
  }  

  statusMessage(message) {
    console.log(message);
    this.setState({
      statusMessage: message
    });
  }

  render() {
    if (this.state.loaded) {
      return (
        <div>
          <AppState webpplFunc={this.state.webpplFunc}
                    initialWebPPLResult={this.state.initialWebPPLResult} />
        </div>);
    } else {
      return (
        <div id="loader">
          {this.state.statusMessage}
        </div>);
    }
  }

}


Meteor.startup(() => {
  render(<WebPPLLoader />, document.getElementById('app'));
});
