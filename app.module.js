angular
    .module('app', ['firebase'])
    // You need to fill in your own config properties from the firebase console
    .constant('firebaseConfig', {
        apiKey: "AIzaSyC3trx5BRRjD3zH4F74z-I-MsJ5i0Acr0k",
        authDomain: "finaltodolist.firebaseapp.com",
        databaseURL: "https://finaltodolist.firebaseio.com",
        projectId: "finaltodolist",
        storageBucket: "finaltodolist.appspot.com",
        messagingSenderId: "952119472285",
    })
    .run(firebaseConfig => firebase.initializeApp(firebaseConfig))
    .service('dbRefRoot', DbRefRoot)
    .service('todos', ToDos)
    .factory('todoFactory', ToDoFactory)
    .factory('todoListFactory', ToDoListFactory)
    .controller('ToDoCtrl', ToDoCtrl)

/**
 * Add a ToDo factory object which extends the native capabilities of the $firebaseObject
 * to covert dates stored as timestamps in milliseconds to a javascript Date object
 * (compatible with HTML 5 <input type="date">) and back again when saving to the database.
 */
function ToDoFactory($firebaseObject, $firebaseUtils) {
    return $firebaseObject.$extend({
        /**
         * Called each time there is an update from the server
         * to update our ToDo data
         */
        $$updated: function (snap) {
            // apply the changes using the super class method
            const changed = $firebaseObject.prototype.$$updated.apply(this, arguments);
            // manipulate the date
            if (changed) {
                this.dueDate = this.dueDate ? new Date(this.dueDate) : null
            }
            // inform the sync manager that it changed
            return changed
        },

        /**
         * Used when our todo is saved back to the server
         * to convert our dates back to JSON
         */
        toJSON: function () {
            return $firebaseUtils.toJSON(angular.extend({}, this, {
                // revert Date objects to json data (stored as a timestamp in milliseconds)
                dueDate: this.dueDate ? this.dueDate.getTime() : null
            }))
        },

        /**
         * Sets the default values when properties are not specified on the server
         */
        $$defaults: {
            Task: '',
            Where: '',
            comments: '',
            dueDate: new Date(),
            category: '',
            priority: '',
            balance: 0,
        }
    })

}

function ToDoListFactory($firebaseArray, todoFactory) {
    return $firebaseArray.$extend({
        // change the added behavior to return todo objects
        $$added: function (snap) {
            // instead of creating the default POJO (plain old JavaScript object)
            // we will return an instance of the todoFactory class each time a child_added
            // event is received from the server
            return todoFactory(snap.ref)
        },

        // override the update behavior to reload the updated todoFactory object
        $$updated: function (snap) {
            return todoFactory(snap.ref)
        }
    })
}

/**
 * dbRefRoot service constructor function
 */
function DbRefRoot() {
    return firebase.database().ref()
}

/**
 * ToDos service constructor function
 */
function ToDos(dbRefRoot, todoFactory, todoListFactory) {

    // set the firebase ref to the top of our todo list in the database tree
    // remember: the database is just a big JSON document stored in the cloud
    const dbRefToDos = dbRefRoot.child('todos')

    this.get = id => todoFactory(dbRefToDos.child(id))

    this.getAll = () => todoListFactory(dbRefToDos)

    this.getDefaults = () => todoFactory(dbRefToDos.child(0))

}

/**
 * ToDo Controller constructor function
 */
function ToDoCtrl(todos) {

    // populate our newToDo object with the todos service default values
    this.newToDo = todos.getDefaults()

    // an example of loading a single todo object
    // where '1234567890ABCDEF1234567890ABCDE3' is the database key for the record.
    this.todo = todos.get('1234567890ABCDEF1234567890ABCDE3')

    // load our complete todoList array
    this.todos = todos.getAll()

    // permenantly remove a todo from our list (both in the browser and on the database)
    this.remove = todo => {
        if (confirm("Are your sure you want to delete this todo?")) {
            this.todos.$remove(todo)
        }
    }

    // sync the updates to a todo record back to the database
    this.complete = todo => {
        this.todos.$complete(todo)
    }

    // add a new todo (based on the values linked in our form) to our todoList
    // then reset our newToDo object to clear the form
    this.addToDo = newToDo => {
        this.todos
            .$add(newToDo)
            .then(newRef => {
                this.newToDo = todos.getDefaults()
            })
    }

}
