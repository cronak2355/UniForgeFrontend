import { Link } from 'react-router-dom';
import { memo } from 'react';

const Hero = () => {
    return (
        <header className="hero">
            <div className="container hero-content">
                <div className="hero-text">
                    <h1>상상을 현실로<br /><span className="gradient-text">Uniforge</span></h1>
                    <p>복잡한 코드는 잊으세요. 드래그 앤 드롭으로 세상을 만들고, <br />클릭 한 번으로 Unity로 내보내세요.</p>
                    <div className="hero-btn-container">
                        <Link to="/auth" className="btn-hero-new">
                            <span className="btn-text">START CREATING</span>
                            <span className="btn-icon"><i className="fa-solid fa-arrow-right"></i></span>
                        </Link>
                    </div>
                </div>
                <div className="hero-image">
                    <div className="floating-card card-1">
                        <i className="fa-solid fa-dragon"></i>
                        <span>Monster.asset</span>
                    </div>
                    <div className="floating-card card-2">
                        <i className="fa-solid fa-tree"></i>
                        <span>Forest.map</span>
                    </div>
                    <div className="floating-card card-3">
                        <i className="fa-brands fa-unity"></i>
                        <span>Export to Unity</span>
                    </div>
                    <div className="editor-preview">
                        <div className="ui-sidebar"></div>
                        <div className="ui-viewport">
                            <div className="ui-object cube"></div>
                            <div className="ui-object sphere"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="background-glow"></div>
        </header>
    );
};

export default memo(Hero);
