import _ from 'lodash';
import React from 'react';
import Dropdown from './dropdown.jsx';
import { Meteor } from 'meteor/meteor';
import { PropTypes } from 'react';
import { render } from 'react-dom';
import './main.html';


const models = {
  'number-game-discrete': {
    name: 'Number game (discrete)',
    url: '/models/number-game-discrete.wppl',
    prompt: 'Think of a number between 1 and 100. I\'ll try to guess it.',
    renderState: (state) => {
      return state;
    },
    isContinuous: false
  },
  'movies': {
    name: 'Movie ranking',
    url: '/models/movies.wppl',
    prompt: 'Here are a few movies. I\'ll try to figure out your ranking.',
    renderState: (state) => {
      return <ol>{state.map((el) => { return <li key={el}>{el}</li>; })}</ol>;
    },
    isContinuous: false
  },
  'number-game-continuous': {
    name: 'Number game (continuous)',
    url: '/models/number-game-continuous.wppl',
    prompt: 'Think of a number between 0 and 1. I\'ll try to guess it.',
    renderState: (state) => {
      return state;
    },
    isContinuous: true
  }
};


function renderQuestion(question) {
  const data = question.questionData || [];
  let q = question.questionText;
  for (let i = 0; i < data.length; i++) {
    q = q.replace(`#${(i + 1)}`, question.questionData[i]);
  }
  return q;
}

function questionKey(question) {
  return question.questionText + JSON.stringify(question.questionData);
}


function History(props) {
  return (
    <ul id="history">{
      props.entries.map((obj) => {
        return (
          <li key={questionKey(obj)}>
            <span className="questionText">{renderQuestion(obj)}</span> {' '}
            <span className="answerText">{obj.actualAnswer}</span>
          </li>);
      })}
    </ul>);
}

History.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.object).isRequired,
};


function Future(props) {
  return (
    <ul id="future">{
      props.entries.map((obj) => {
        return (
          <li key={questionKey(obj)}>
            {renderQuestion(obj)} {' '}
            ({obj.expectedInfoGain.toFixed(2)} bits)
          </li>);
      })}
    </ul>);
}

Future.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.object).isRequired,
};


class DiscreteQuestion extends React.Component {

  handleAnswer(e, value) {
    this.props.processAnswer(value);
  }

  render() {
    console.log(this.props.question.answerType.discrete.values);
    return (
      <div id="question">
        <div key={questionKey(this.props.question)} id="questionText">
          {renderQuestion(this.props.question)}
        </div>
        <div id="answerInputs">
          {this.props.question.answerType.discrete.values.map((value) => {
             return (
               <input type="button"
                      value={value}
                      key={value}
                      onClick={(e)=>{this.handleAnswer(e, value)}} />);
           })}
        </div>
      </div>);
  }
}

DiscreteQuestion.propTypes = {
  processAnswer: PropTypes.func.isRequired,
  question: PropTypes.object.isRequired,
};


function Question(props) {
  if (props.question.answerType && props.question.answerType.discrete) {
    return <DiscreteQuestion {...props} />;
  } else {
    throw new Error(`Unknown answer type: ${props.question.answerType}`);
  }
}

Question.propTypes = {
  processAnswer: PropTypes.func.isRequired,
  question: PropTypes.object.isRequired,
};


function OutOfQuestions() {
  return <p>I'm out of questions.</p>;
}


class App extends React.Component {

  renderBox() {
    const currentQuestion = this.props.currentQuestion;
    const infoToGain = !this.props.noInfoToGain;
    const isThinking = this.props.isThinking;
    const renderState = models[this.props.modelID].renderState;
    if (!currentQuestion) {
      return <OutOfQuestions />
    }
    if (!infoToGain) {
      return (
        <div id="done">
          <p>I have learned all I could learn from you.</p>
          <p>The answer is:</p>
          {renderState(this.props.MAPState)}
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
    const renderState = models[this.props.modelID].renderState;
    return (
      <div>
        <p id="prompt">{models[this.props.modelID].prompt}</p>
        <History entries={this.props.history} />
        {this.renderBox()}
        <Future entries={this.props.future} />
        <div id="entropy">
          <span>Remaining entropy:</span>
          {(this.props.entropy !== null) ?
           ` ${this.props.entropy.toFixed(2)} bits` :
           " unknown"}
        </div>
        <div id="best-guess">
          <span>Best guess:</span> {' '}
          {this.props.MAPState ? renderState(this.props.MAPState) : "none yet"}
        </div>
      </div>);
  }

}

App.propTypes = {
  history: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentQuestion: PropTypes.object,
  processAnswer: PropTypes.func.isRequired,
  future: PropTypes.arrayOf(PropTypes.object).isRequired,
  noInfoToGain: PropTypes.bool.isRequired,
  isThinking: PropTypes.bool.isRequired,
  MAPState: PropTypes.any,
  modelID: PropTypes.string.isRequired,
  entropy: PropTypes.number
};


class AppState extends React.Component {

  constructor(props) {
    super(props);
    const { questions } = this.props.initialWebPPLResult;
    this.state = {
      history: [],
      currentQuestion: questions[0],
      future: questions.slice(1),
      noInfoToGain: false,
      isThinking: false,
      MAPState: null,
      entropy: null
    };
  }

  processAnswer(actualAnswer) {
    const { history, currentQuestion, future } = this.state;
    const newState = {
      history: history.concat([_.assign({}, currentQuestion, { actualAnswer })]),
      currentQuestion: future[0],
      future: future.slice(1)
    };
    this.setState(newState);
    if (newState.future.length === 0) {
      return;
    }
    this.setState({ isThinking: true });
    setTimeout(() => {
      const options = {
        history: newState.history,
        currentQuestion: newState.currentQuestion,
        renderQuestion
      };
      this.props.webpplFunc(options, (result) => {
        const { questions, MAPState, entropy } = result;
        const bestQuestion = questions[0];
        this.setState({
          currentQuestion: bestQuestion,
          future: questions.slice(1),
          isThinking: false,
          MAPState,
          entropy
        });
        if (bestQuestion.expectedInfoGain < 0.0001) { // 1e-15
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
           future={this.state.future}
           noInfoToGain={this.state.noInfoToGain}
           isThinking={this.state.isThinking}
           MAPState={this.state.MAPState}
           entropy={this.state.entropy}
           modelID={this.props.modelID} />
    );
  }
}

AppState.propTypes = {
  initialWebPPLResult: PropTypes.any,
  modelID: PropTypes.string.isRequired,
  webpplFunc: PropTypes.func.isRequired
};


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
    const frameworkURL = (models[this.props.modelID].isContinuous ?
                          '/models/framework-continuous.wppl' :
                          '/models/framework-discrete.wppl');
    $.ajax({
      url: frameworkURL,
      success: (frameworkCode) => {
        statusMessage('Loading model code...');
        $.ajax({
          url: models[this.props.modelID].url,
          success: (domainCode) => {
            const code = `${frameworkCode} \n\n ${domainCode} \n\n makeModel(domain)`;
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
        <AppState webpplFunc={this.state.webpplFunc}
                  modelID={this.props.modelID}
                  initialWebPPLResult={this.state.initialWebPPLResult} />);
    } else {
      return (
        <div id='loader'>
          {this.state.statusMessage}
        </div>);
    }
  }

}

WebPPLLoader.propTypes = {
  modelID: PropTypes.string.isRequired
};


class ModelSelector extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      modelID: _.keys(models)[0]
    };
  }

  render() {
    const options = _.keys(models).map((id) => {
      return {
        value: id,
        label: models[id].name
      };
    });
    return (      
      <div id='model-selector'>
        <div>
          <Dropdown id="model-selector-dropdown"
                    options={options}
                    value={this.state.modelID}
                    onChange={(change) => {this.setState({ modelID: change.newValue });}} />
        </div>
        <WebPPLLoader modelID={this.state.modelID} key={this.state.modelID} />
      </div>);
  }

}


Meteor.startup(() => {
  render(<ModelSelector />, document.getElementById('app'));
});
