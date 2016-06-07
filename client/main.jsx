import _ from 'lodash';
import React from 'react';
import { Meteor } from 'meteor/meteor';
import { PropTypes } from 'react';
import { render } from 'react-dom';
import './main.html';



const models = {
  'number-game': {
    url: "/models/number-game.wppl",
    prompt: "Think of a number between 1 and 100. I'll try to guess it."
  },
  'movies': {
    url: "/models/movies.wppl",
    prompt: "Here are a few movies. I'll try to figure out your ranking."
  },
};

const modelID = 'movies';



function renderAnswer(question) {
  if (question.type === 'bool') {
    return question.answerValue ? 'Yes.' : 'No.';
  } else {
    throw new Error("Can't handle question type: " + question.type);
  }
}

function renderQuestion(question) {
  const data = question.questionData || [];
  let q = question.questionText;
  for (let i = 0; i < data.length; i++) {
    q = q.replace('#' + (i + 1), question.questionData[i]);
  }
  return q;
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
              <span className="answerText">{renderAnswer(obj)}</span>
            </li>);
        })}
      </ul>);
  }

}

History.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.object).isRequired,
};


class UpcomingQuestions extends React.Component {

  render() {
    return (
      <ul id="upcoming-questions">{
        this.props.entries.map((obj) => {
          return (
            <li key={questionKey(obj)}>
              {renderQuestion(obj)} {' '}
              ({obj.expectedInfoGain.toFixed(2)} bits)
            </li>);
        })}
      </ul>);
  }

}

UpcomingQuestions.propTypes = {
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
    const currentQuestion = this.props.currentQuestion;
    const infoToGain = !this.props.noInfoToGain;
    const isThinking = this.props.isThinking;
    if (!currentQuestion) {
      return <OutOfQuestions />
    }
    if (!infoToGain) {
      return (
        <div id="done">
          <p>I have learned all I could learn from you.</p>
          <p>The answer is {JSON.stringify(this.props.MAPState)}.</p>
        </div>);
    }
    if (isThinking) {
      return <div id="thinking">Let me think...</div>;
    }
    return (
      <Question id={questionKey(currentQuestion)}
                processAnswer={this.props.processAnswer}
                question={currentQuestion} />);
  }

  render() {
    return (
      <div>
        <p id="prompt">{models[modelID].prompt}</p>
        <History entries={this.props.history} />
        {this.renderBox()}
        <UpcomingQuestions entries={this.props.upcomingQuestions} />
      </div>);
  }

}

App.propTypes = {
  history: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentQuestion: PropTypes.object,
  processAnswer: PropTypes.func.isRequired,
  upcomingQuestions: PropTypes.arrayOf(PropTypes.object).isRequired,
  noInfoToGain: PropTypes.bool.isRequired,
  isThinking: PropTypes.bool.isRequired,
  MAPState: PropTypes.any,
};


class AppState extends React.Component {

  constructor(props) {
    super(props);
    const { questions } = this.props.initialWebPPLResult;
    this.state = {
      history: [],
      currentQuestion: questions[0],
      upcomingQuestions: questions.slice(1),
      noInfoToGain: false,
      isThinking: false,
      MAPState: null
    };
  }

  processAnswer(answerValue) {
    const { history, currentQuestion, upcomingQuestions } = this.state;
    const newState = {
      history: history.concat([
        _.assign(
          {},
          {
            questionText: currentQuestion.questionText,
            questionData: currentQuestion.questionData,
            type: currentQuestion.type,
            expectedInfoGain: currentQuestion.expectedInfoGain
          },
          { answerValue })]),
      currentQuestion: upcomingQuestions[0],
      upcomingQuestions: upcomingQuestions.slice(1)
    };
    this.setState(newState);
    if (newState.upcomingQuestions.length === 0) {
      return;
    }
    this.setState({ isThinking: true });
    setTimeout(() => {
      const options = {
        history: newState.history,
        currentQuestion: newState.currentQuestion,
        renderQuestion: renderQuestion
      };
      this.props.webpplFunc(options, (result) => {
        const { questions, MAPState } = result;
        const bestQuestion = questions[0];        
        this.setState({
          currentQuestion: bestQuestion,
          upcomingQuestions: questions.slice(1),
          isThinking: false,
          MAPState,
        });
        if (bestQuestion.expectedInfoGain < 1e-15) {
          this.setState({
            noInfoToGain: true
          });
        }
      });
    });
  }

  render() {
    return (
      <App currentQuestion={this.state.currentQuestion}
           history={this.state.history}
           processAnswer={this.processAnswer.bind(this)}
           upcomingQuestions={this.state.upcomingQuestions}
           noInfoToGain={this.state.noInfoToGain}
           isThinking={this.state.isThinking}
           MAPState={this.state.MAPState} />
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
    statusMessage('Loading webppl framework...');
    $.ajax({
      url: "/models/framework.wppl",
      success: function(frameworkCode){
        statusMessage('Loading model code...');
        $.ajax({
          url: models[modelID].url,
          success: function(modelCode){
            const code = frameworkCode + '\n\n' + modelCode + '\n\n model';
            statusMessage('Evaluating model to get webppl function...');
            webppl.run(code, (s, cpsWebPPLFunc) => {
              statusMessage('Got compiled webppl function.');
              const webpplFunc = (arg, callback) => {
                var f = cpsWebPPLFunc({}, (s, result) => {
                  statusMessage('Got result from running webppl function.');
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
