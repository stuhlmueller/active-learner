// http://jsfiddle.net/davidwaterston/7a3xxLtw/

import React from 'react';


class Dropdown extends React.Component {

  constructor(props) {
    super(props);
    var selected = this.getSelectedFromProps(props);
    this.state = {
      selected: selected
    }
  }
  
  componentWillReceiveProps(nextProps) {
    var selected = this.getSelectedFromProps(nextProps);
    this.setState({
      selected: selected
    });
  }
  
  getSelectedFromProps(props) {
    var selected;
    if (props.value === null && props.options.length !== 0) {
      selected = props.options[0][props.valueField];
    } else {
      selected = props.value;
    }
    return selected;
  }

  render() {
    var self = this;
    var options = self.props.options.map(function(option) {
      return (
        <option key={option[self.props.valueField]} value={option[self.props.valueField]}>
          {option[self.props.labelField]}
        </option>
      )
    });
    return (
      <select id={this.props.id} 
              className='form-control' 
              value={this.state.selected} 
              onChange={this.handleChange.bind(this)}>
        {options}
      </select>
    )
  }

  handleChange(e) {
    if (this.props.onChange) {
      var change = {
        oldValue: this.state.selected,
        newValue: e.target.value
      }
      this.props.onChange(change);
    }
    this.setState({selected: e.target.value});
  }

};

Dropdown.propTypes = {
  id: React.PropTypes.string.isRequired,
  options: React.PropTypes.array.isRequired,
  value: React.PropTypes.oneOfType(
    [
      React.PropTypes.number,
      React.PropTypes.string
    ]
  ),
  valueField: React.PropTypes.string,
  labelField: React.PropTypes.string,
  onChange: React.PropTypes.func
};

Dropdown.defaultProps = {
  value: null,
  valueField: 'value',
  labelField: 'label',
  onChange: null
};


export default Dropdown;
