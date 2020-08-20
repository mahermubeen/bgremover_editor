import React from "react";

class TabsControl extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentIndex: 0,
    };
  }

  getInitialState() {
    return { currentIndex: 0 };
  }

  getTitleItemCssClasses(index) {
    return index === this.state.currentIndex
      ? "tab-title-item1 active1"
      : "tab-title-item1";
  }

  getContentItemCssClasses(index) {
    return index === this.state.currentIndex
      ? "tab-content-item1 active1"
      : "tab-content-item1";
  }

  render() {
    let that = this;
    let { baseWidth } = this.props;
    let childrenLength = this.props.children.length;
    return (
      <div className="tab-container">
        <nav className="tab-title-items1">
          {React.Children.map(this.props.children, (element, index) => {
            return (
              <div
                onClick={() => {
                  this.setState({ currentIndex: index });
                }}
                className={that.getTitleItemCssClasses(index)}
              >
                {element.props.img}
                {element.props.name}
              </div>
            );
          })}
        </nav>
        <div className="tab-content-items1">
          {React.Children.map(this.props.children, (element, index) => {
            return (
              <div className={that.getContentItemCssClasses(index)}>
                {element}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default TabsControl;
